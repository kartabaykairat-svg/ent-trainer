"""Glue between the Client/DocumentRecord ORM rows and the ClientData
pydantic model, plus the "re-run the merge for one person" operation used
after every document upload/removal/conflict resolution.
"""
from app.models import Client, DocumentRecord
from app.schemas import ClientData
from app.services.extraction import ExtractionResult, FieldResult
from app.services.merge import DocSource, merge_person_documents


def get_client_data(client: Client) -> ClientData:
    return ClientData.model_validate(client.data or {})


def save_client_data(client: Client, data: ClientData) -> None:
    client.data = data.model_dump()
    client.masked_full_name = _mask_name(data.c1.full_name)
    client.masked_iin = _mask_iin(data.c1.iin)
    client.needs_review = _needs_review(data)


def _mask_name(full_name: str) -> str:
    from app.security import mask_full_name
    return mask_full_name(full_name)


def _mask_iin(iin: str) -> str:
    from app.security import mask_iin
    return mask_iin(iin)


def _needs_review(data: ClientData) -> bool:
    if any(not c.resolved for c in data.conflicts):
        return True
    for meta in data.field_confidence.values():
        if meta.confidence in ("low", "missing"):
            return True
    return not data.manager_confirmed


def _extraction_from_dict(d: dict) -> ExtractionResult:
    result = ExtractionResult(
        doc_type=d.get("doc_type", "other"),
        doc_type_confidence=d.get("doc_type_confidence", "low"),
        iin_candidates=d.get("iin_candidates", []),
        raw_text_len=d.get("raw_text_len", 0),
    )
    for k, v in (d.get("fields") or {}).items():
        result.fields[k] = FieldResult(value=v.get("value", ""), confidence=v.get("confidence", "missing"), raw_candidates=v.get("raw_candidates", []))
    return result


def rebuild_person(client: Client, person_key: str) -> ClientData:
    """Re-runs the cross-document merge for c1 or c2 from the stored
    per-document extraction results, updating client.data in place."""
    data = get_client_data(client)
    docs: list[DocumentRecord] = [d for d in client.documents if d.belongs_to == person_key and d.extracted_fields]
    sources = [
        DocSource(document_id=d.id, filename="", extraction=_extraction_from_dict({"fields": d.extracted_fields, "doc_type": d.doc_type}))
        for d in docs
        if d.extracted_fields
    ]
    existing_conflicts = [c for c in data.conflicts if c.person != person_key]
    person, field_confidence, conflicts = merge_person_documents(person_key, sources, data.conflicts)

    if person_key == "c1":
        data.c1 = person
    else:
        data.c2 = person

    data.field_confidence = {k: v for k, v in data.field_confidence.items() if not k.startswith(f"{person_key}.")}
    data.field_confidence.update(field_confidence)
    data.conflicts = existing_conflicts + conflicts
    save_client_data(client, data)
    return data
