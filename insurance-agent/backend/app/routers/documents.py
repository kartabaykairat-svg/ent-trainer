from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.audit import log_action
from app.config import get_settings
from app.database import get_db
from app.deps import get_current_manager
from app.models import Client, GeneratedDocument, Manager
from app.routers.clients import _get_client_or_404, _serialize
from app.services.client_service import get_client_data
from app.services.cleanup import delete_client_source_documents
from app.services.docx_fill import (
    build_contract_context,
    build_poa_context,
    render_docx,
    scan_for_leftover_placeholders,
)
from app.services.pdf_export import convert_to_pdf, libreoffice_available
from app.services.validation import pre_generation_validate

router = APIRouter(prefix="/api/clients/{client_id}", tags=["documents"])


def _safe_name(full_name: str) -> str:
    import re
    cleaned = re.sub(r"[^\w\s-]", "", full_name or "client", flags=re.UNICODE).strip()
    cleaned = re.sub(r"\s+", "_", cleaned)
    return cleaned or "client"


@router.get("/checklist")
def quality_checklist(client_id: str, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    data = get_client_data(client)
    errors = pre_generation_validate(data)
    items = [
        ("ФИО совпадает с удостоверением", not any("ФИО" in e for e in errors)),
        ("ИИН совпадает с удостоверением", not any("ИИН" in e for e in errors)),
        ("Дата рождения совпадает", not any("дата рождения" in e.lower() for e in errors)),
        ("Адрес корректно перенесён", not any("адрес" in e.lower() for e in errors)),
        ("Номер документа корректен", not any("номер документа" in e.lower() for e in errors)),
        ("Дата выдачи корректна", not any("дата выдачи" in e.lower() for e in errors)),
        ("Страховая премия заполнена", not any("премии" in e.lower() for e in errors)),
        ("Размер первой выплаты заполнен", not any("первой страховой выплаты" in e.lower() for e in errors)),
        ("Данные второго страхователя корректны, если он есть", not (data.second_insurer and any("Второй страхователь" in e for e in errors))),
        ("Нет неразрешённых противоречий", not any(not c.resolved for c in data.conflicts)),
        ("Данные подтверждены менеджером", data.manager_confirmed),
    ]
    return {"items": [{"label": label, "ok": ok} for label, ok in items], "errors": errors, "passed": len(errors) == 0}


@router.post("/generate")
def generate_documents(client_id: str, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    data = get_client_data(client)

    errors = pre_generation_validate(data)
    if errors:
        raise HTTPException(422, detail={"message": "Документ не может быть сформирован", "errors": errors})

    settings = get_settings()
    out_dir = settings.generated_dir / client_id
    out_dir.mkdir(parents=True, exist_ok=True)
    safe_name = _safe_name(data.c1.full_name)

    contract_ctx = build_contract_context(data)
    contract_path = out_dir / f"Договор_пенсионного_аннуитета_{safe_name}.docx"
    render_docx(settings.templates_dir / "contract_template.docx", contract_ctx, contract_path)

    poa_ctx = build_poa_context(data)
    poa_path = out_dir / f"Доверенность_{safe_name}.docx"
    render_docx(settings.templates_dir / "poa_template.docx", poa_ctx, poa_path)

    leftover = scan_for_leftover_placeholders(contract_path) + scan_for_leftover_placeholders(poa_path)
    if leftover:
        contract_path.unlink(missing_ok=True)
        poa_path.unlink(missing_ok=True)
        raise HTTPException(422, detail={"message": "Документ не может быть сформирован", "errors": leftover})

    # replace any previous generated files for this client
    for g in list(client.generated_files):
        old = Path(g.storage_path)
        old.unlink(missing_ok=True)
        db.delete(g)
    db.commit()

    db.add(GeneratedDocument(client_id=client.id, doc_type="contract", file_format="docx", storage_path=str(contract_path)))
    db.add(GeneratedDocument(client_id=client.id, doc_type="poa", file_format="docx", storage_path=str(poa_path)))

    pdf_paths = {}
    if libreoffice_available():
        for doc_type, path in (("contract", contract_path), ("poa", poa_path)):
            pdf = convert_to_pdf(path, out_dir)
            if pdf:
                pdf_paths[doc_type] = pdf
                db.add(GeneratedDocument(client_id=client.id, doc_type=doc_type, file_format="pdf", storage_path=str(pdf)))

    from app.models import ClientStatus
    client.status = ClientStatus.generated
    client.contract_generated = True
    client.poa_generated = True
    db.commit()

    if settings.delete_source_docs_after_generation:
        delete_client_source_documents(db, client)

    log_action(db, manager_id=manager.id, client_id=client_id, action="documents_generated", detail=f"pdf={'yes' if pdf_paths else 'no'}")
    return {"ok": True, "client": _serialize(client), "pdf_available": bool(pdf_paths)}


@router.get("/download/{doc_type}/{fmt}")
def download_document(client_id: str, doc_type: str, fmt: str, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    if doc_type not in ("contract", "poa") or fmt not in ("docx", "pdf"):
        raise HTTPException(400, "Некорректный тип документа или формат")
    record = (
        db.query(GeneratedDocument)
        .filter(GeneratedDocument.client_id == client.id, GeneratedDocument.doc_type == doc_type, GeneratedDocument.file_format == fmt)
        .order_by(GeneratedDocument.created_at.desc())
        .first()
    )
    if not record or not Path(record.storage_path).exists():
        raise HTTPException(404, "Файл не найден. Сформируйте документы заново.")
    log_action(db, manager_id=manager.id, client_id=client_id, action="document_downloaded", detail=f"{doc_type}.{fmt}")
    media_type = "application/pdf" if fmt == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(record.storage_path, media_type=media_type, filename=Path(record.storage_path).name)


@router.post("/delete-source-documents")
def delete_source_documents(client_id: str, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    removed = delete_client_source_documents(db, client)
    log_action(db, manager_id=manager.id, client_id=client_id, action="source_documents_deleted", detail=f"removed={removed}")
    return {"ok": True, "removed": removed}
