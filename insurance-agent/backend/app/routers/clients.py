import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.audit import log_action
from app.config import get_settings
from app.database import get_db
from app.deps import get_current_manager
from app.models import Client, ClientStatus, DocumentRecord, Manager
from app.schemas import ClientData, ConflictResolution, FieldEdit
from app.services.client_service import get_client_data, rebuild_person, save_client_data
from app.services.extraction import ExtractionResult, extract_fields
from app.services.llm_extraction import extract_with_llm, is_available as llm_available, merge_llm_fields
from app.services.ocr import extract_text

router = APIRouter(prefix="/api/clients", tags=["clients"])

ALLOWED_SUFFIXES = {".jpg", ".jpeg", ".png", ".pdf", ".docx"}
ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _get_client_or_404(db: Session, client_id: str, manager: Manager) -> Client:
    client = db.query(Client).filter(Client.id == client_id, Client.manager_id == manager.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return client


def _serialize(client: Client) -> dict:
    data = get_client_data(client)
    return {
        "id": client.id,
        "status": client.status.value,
        "second_insurer": client.second_insurer,
        "needs_review": client.needs_review,
        "contract_generated": client.contract_generated,
        "poa_generated": client.poa_generated,
        "documents_deleted": client.documents_deleted,
        "created_at": client.created_at.isoformat(),
        "updated_at": client.updated_at.isoformat(),
        "masked_iin": client.masked_iin,
        "masked_full_name": client.masked_full_name,
        "data": data.model_dump(),
        "documents": [
            {
                "id": d.id,
                "filename": d.original_filename,
                "doc_type": d.doc_type,
                "doc_type_confirmed": d.doc_type_confirmed,
                "belongs_to": d.belongs_to,
                "ocr_confidence": d.ocr_confidence,
                "has_file": d.storage_path is not None,
                "created_at": d.created_at.isoformat(),
            }
            for d in client.documents
        ],
    }


@router.post("")
def create_client(payload: dict, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    second_insurer = bool(payload.get("second_insurer", False))
    client = Client(manager_id=manager.id, second_insurer=second_insurer, status=ClientStatus.draft)
    data = ClientData(second_insurer=second_insurer)
    client.data = data.model_dump()
    db.add(client)
    db.commit()
    db.refresh(client)
    log_action(db, manager_id=manager.id, client_id=client.id, action="client_created", detail=f"second_insurer={second_insurer}")
    return _serialize(client)


@router.get("")
def list_clients(manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    clients = db.query(Client).filter(Client.manager_id == manager.id).order_by(Client.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "masked_full_name": c.masked_full_name or "(данные не заполнены)",
            "masked_iin": c.masked_iin,
            "status": c.status.value,
            "needs_review": c.needs_review,
            "contract_generated": c.contract_generated,
            "poa_generated": c.poa_generated,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        }
        for c in clients
    ]


@router.get("/{client_id}")
def get_client(client_id: str, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    return _serialize(_get_client_or_404(db, client_id, manager))


@router.delete("/{client_id}")
def delete_client(client_id: str, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    for d in client.documents:
        if d.storage_path:
            Path(d.storage_path).unlink(missing_ok=True)
    for g in client.generated_files:
        Path(g.storage_path).unlink(missing_ok=True)
    db.delete(client)
    db.commit()
    log_action(db, manager_id=manager.id, client_id=client_id, action="client_deleted")
    return {"ok": True}


@router.post("/{client_id}/documents")
async def upload_documents(
    client_id: str,
    files: list[UploadFile],
    belongs_to: str = "c1",
    manager: Manager = Depends(get_current_manager),
    db: Session = Depends(get_db),
):
    client = _get_client_or_404(db, client_id, manager)
    settings = get_settings()
    if belongs_to not in ("c1", "c2"):
        raise HTTPException(400, "belongs_to must be c1 or c2")

    results = []
    for f in files:
        suffix = Path(f.filename or "").suffix.lower()
        if suffix not in ALLOWED_SUFFIXES:
            results.append({"filename": f.filename, "error": "Неподдерживаемый формат файла"})
            continue
        content = await f.read()
        if len(content) > settings.max_upload_mb * 1024 * 1024:
            results.append({"filename": f.filename, "error": f"Файл превышает {settings.max_upload_mb} МБ"})
            continue

        doc_id = uuid.uuid4().hex
        dest = settings.uploads_dir / client_id / f"{doc_id}{suffix}"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)

        text, ocr_conf = extract_text(f.filename or dest.name, content, f.content_type or "")
        extraction: ExtractionResult = extract_fields(text)
        if llm_available():
            llm_out = extract_with_llm(text)
            extraction.fields = merge_llm_fields(extraction.fields, llm_out)

        record = DocumentRecord(
            id=doc_id,
            client_id=client.id,
            original_filename=f.filename or dest.name,
            content_type=f.content_type or "",
            doc_type=extraction.doc_type,
            doc_type_confirmed=extraction.doc_type_confidence == "high",
            belongs_to=belongs_to,
            storage_path=str(dest),
            ocr_text=text,
            ocr_confidence=ocr_conf,
            extracted_fields={k: {"value": v.value, "confidence": v.confidence, "raw_candidates": v.raw_candidates} for k, v in extraction.fields.items()},
        )
        db.add(record)
        db.commit()

        results.append({
            "id": doc_id,
            "filename": f.filename,
            "doc_type": extraction.doc_type,
            "doc_type_confidence": extraction.doc_type_confidence,
            "doc_type_recognized": extraction.doc_type_confidence != "low",
            "ocr_confidence": ocr_conf,
            "fields_found": len(extraction.fields),
        })

    if client.status == ClientStatus.draft:
        client.status = ClientStatus.data_review
    db.commit()
    db.refresh(client)

    rebuild_person(client, belongs_to)
    db.commit()

    log_action(db, manager_id=manager.id, client_id=client_id, action="documents_uploaded", detail=f"count={len(files)} belongs_to={belongs_to}")
    return {"uploaded": results, "client": _serialize(client)}


@router.post("/{client_id}/documents/{document_id}/type")
def set_document_type(client_id: str, document_id: str, payload: dict, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == document_id, DocumentRecord.client_id == client.id).first()
    if not doc:
        raise HTTPException(404, "Документ не найден")
    doc.doc_type = payload.get("doc_type", doc.doc_type)
    doc.doc_type_confirmed = True
    db.commit()
    return {"ok": True}


@router.delete("/{client_id}/documents/{document_id}")
def delete_document(client_id: str, document_id: str, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == document_id, DocumentRecord.client_id == client.id).first()
    if not doc:
        raise HTTPException(404, "Документ не найден")
    if doc.storage_path:
        Path(doc.storage_path).unlink(missing_ok=True)
    belongs_to = doc.belongs_to
    db.delete(doc)
    db.commit()
    db.refresh(client)
    rebuild_person(client, belongs_to)
    db.commit()
    return _serialize(client)


@router.post("/{client_id}/conflicts/resolve")
def resolve_conflict(client_id: str, payload: ConflictResolution, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    data = get_client_data(client)
    conflict = next((c for c in data.conflicts if c.id == payload.conflict_id), None)
    if not conflict:
        raise HTTPException(404, "Противоречие не найдено")
    conflict.resolved = True
    conflict.resolved_value = payload.resolved_value
    save_client_data(client, data)
    db.commit()
    db.refresh(client)
    rebuild_person(client, conflict.person)
    db.commit()
    log_action(db, manager_id=manager.id, client_id=client_id, action="conflict_resolved", detail=f"{conflict.person}.{conflict.field}")
    return _serialize(client)


@router.post("/{client_id}/field")
def edit_field(client_id: str, payload: FieldEdit, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    data = get_client_data(client)
    obj = data
    parts = payload.path.split(".")
    for p in parts[:-1]:
        obj = getattr(obj, p)
    setattr(obj, parts[-1], payload.value)
    if payload.path.startswith("c1.") or payload.path.startswith("c2."):
        data.field_confidence[payload.path] = data.field_confidence.get(payload.path)
        from app.schemas import FieldMeta
        data.field_confidence[payload.path] = FieldMeta(confidence="high", source_document_ids=[], manually_edited=True)
    save_client_data(client, data)
    db.commit()
    log_action(db, manager_id=manager.id, client_id=client_id, action="field_edited", detail=payload.path)
    return _serialize(client)


@router.post("/{client_id}/confirm")
def confirm_client_data(client_id: str, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    from datetime import datetime, timezone

    from app.services.validation import pre_generation_validate

    client = _get_client_or_404(db, client_id, manager)
    data = get_client_data(client)
    data.manager_confirmed = True
    data.manager_confirmed_at = datetime.now(timezone.utc).isoformat()
    errors = pre_generation_validate(data)
    # remove the "not confirmed yet" error since we just set it True above
    errors = [e for e in errors if "ещё не подтверждены" not in e]
    if errors:
        data.manager_confirmed = False
        data.manager_confirmed_at = ""
        save_client_data(client, data)
        db.commit()
        return {"ok": False, "errors": errors}

    client.status = ClientStatus.confirmed
    save_client_data(client, data)
    db.commit()
    log_action(db, manager_id=manager.id, client_id=client_id, action="data_confirmed")
    return {"ok": True, "client": _serialize(client)}
