"""Cross-document merge and contradiction detection.

Takes the per-document extraction results for one person (c1 or c2) and
combines them into a single PersonData: fields that agree across every
document that mentions them are accepted (confidence = the best seen);
fields where two documents disagree are NEVER auto-resolved - they become
a Conflict that blocks confirmation until the manager picks a value (see
project brief section 18).
"""
import re
import uuid
from dataclasses import dataclass

from app.schemas import BankInfo, Conflict, ConflictCandidate, DocumentInfo, FieldMeta, PersonData

_FIELD_LABELS_RU = {
    "last_name": "Фамилия", "first_name": "Имя", "middle_name": "Отчество",
    "full_name": "ФИО", "birth_date": "Дата рождения", "iin": "ИИН", "gender": "Пол",
    "registration_address": "Адрес регистрации", "residential_address": "Адрес проживания",
    "document_number": "Номер документа", "issue_date": "Дата выдачи документа",
    "issued_by": "Кем выдан", "phone": "Телефон", "email": "E-mail",
    "bank_name": "Банк", "iban": "Номер счета",
}

_PERSON_SIMPLE_FIELDS = {
    "last_name", "first_name", "middle_name", "full_name", "birth_date", "iin", "gender",
    "registration_address", "residential_address", "phone", "email",
}
_DOCUMENT_FIELDS = {"document_number": "number", "issue_date": "issue_date", "issued_by": "issued_by"}
_BANK_FIELDS = {"bank_name": "name", "iban": "iban"}


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


@dataclass
class DocSource:
    document_id: str
    filename: str
    extraction: "object"  # extraction.ExtractionResult


def merge_person_documents(
    person_key: str,
    sources: list[DocSource],
    existing_conflicts: list[Conflict] | None = None,
) -> tuple[PersonData, dict[str, FieldMeta], list[Conflict]]:
    person = PersonData()
    field_confidence: dict[str, FieldMeta] = {}
    conflicts: list[Conflict] = []
    resolved_by_field = {c.field: c for c in (existing_conflicts or []) if c.person == person_key and c.resolved}

    all_field_keys = set()
    for src in sources:
        all_field_keys.update(src.extraction.fields.keys())

    for field_key in all_field_keys:
        candidates: list[tuple[str, str, str, str]] = []  # (norm_value, value, doc_id, filename)
        best_confidence_rank = {"missing": 0, "low": 1, "medium": 2, "high": 3}
        best_conf = "missing"
        for src in sources:
            fr = src.extraction.fields.get(field_key)
            if not fr:
                continue
            if not fr.value and len(fr.raw_candidates) > 1:
                # A single document found several plausible values for this
                # field (e.g. more than one 12-digit IIN-looking number) and
                # deliberately did not pick one - project brief section 6/18
                # forbid auto-selecting, so surface every candidate from
                # *this* document too, same as a cross-document conflict.
                for cand in fr.raw_candidates:
                    candidates.append((_normalize(cand), cand, src.document_id, src.filename))
                continue
            if not fr.value:
                continue
            candidates.append((_normalize(fr.value), fr.value, src.document_id, src.filename))
            if best_confidence_rank[fr.confidence] > best_confidence_rank[best_conf]:
                best_conf = fr.confidence

        if not candidates:
            continue

        distinct = {}
        for norm, value, doc_id, filename in candidates:
            distinct.setdefault(norm, {"value": value, "docs": []})
            distinct[norm]["docs"].append((doc_id, filename))

        path = f"{person_key}.{field_key}"
        if len(distinct) == 1:
            value = next(iter(distinct.values()))["value"]
            docs = next(iter(distinct.values()))["docs"]
            _set_field(person, field_key, value)
            field_confidence[path] = FieldMeta(confidence=best_conf, source_document_ids=[d[0] for d in docs])
        else:
            existing = resolved_by_field.get(field_key)
            conflict_id = existing.id if existing else uuid.uuid4().hex
            cand_list = [
                ConflictCandidate(value=info["value"], source_document_id=info["docs"][0][0], source_filename=info["docs"][0][1])
                for info in distinct.values()
            ]
            if existing and existing.resolved and existing.resolved_value:
                _set_field(person, field_key, existing.resolved_value)
                field_confidence[path] = FieldMeta(confidence="high", source_document_ids=[c.source_document_id for c in cand_list], manually_edited=True)
                conflicts.append(Conflict(
                    id=conflict_id, person=person_key, field=field_key,
                    field_label=_FIELD_LABELS_RU.get(field_key, field_key),
                    candidates=cand_list, resolved=True, resolved_value=existing.resolved_value,
                ))
            else:
                field_confidence[path] = FieldMeta(confidence="low", source_document_ids=[c.source_document_id for c in cand_list])
                conflicts.append(Conflict(
                    id=conflict_id, person=person_key, field=field_key,
                    field_label=_FIELD_LABELS_RU.get(field_key, field_key),
                    candidates=cand_list, resolved=False, resolved_value=None,
                ))

    if not person.full_name and (person.last_name or person.first_name):
        person.full_name = " ".join(p for p in (person.last_name, person.first_name, person.middle_name) if p)
        field_confidence[f"{person_key}.full_name"] = FieldMeta(confidence="high", source_document_ids=[])

    return person, field_confidence, conflicts


def _set_field(person: PersonData, field_key: str, value: str) -> None:
    if field_key in _PERSON_SIMPLE_FIELDS:
        setattr(person, field_key, value)
    elif field_key in _DOCUMENT_FIELDS:
        setattr(person.document, _DOCUMENT_FIELDS[field_key], value)
    elif field_key in _BANK_FIELDS:
        setattr(person.bank, _BANK_FIELDS[field_key], value)
