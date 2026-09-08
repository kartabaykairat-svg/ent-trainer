"""Deterministic, regex/label-based extraction of client fields from OCR
text of Kazakhstani identity and address documents.

Design principle (see project brief section 6, "запрет на выдумывание
данных"): every function here either finds an exact match for a field in
the source text, or returns "" / None for it. Nothing is guessed,
interpolated or defaulted. Confidence scores reflect how the value was
found (structural label match = high, loose pattern = medium, heuristic
fallback = low) so the UI can flag anything below "high" for mandatory
manual confirmation.

This module is intentionally independent from any LLM: it is the
guaranteed-deterministic fallback (and cross-check) used whether or not
ANTHROPIC_API_KEY is configured - see llm_extraction.py for the optional
LLM-assisted pass that can be merged on top of this one.
"""
import re
from dataclasses import dataclass, field
from datetime import date

IIN_RE = re.compile(r"(?<!\d)(\d{12})(?!\d)")
DATE_RE = re.compile(r"\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}")
IBAN_RE = re.compile(r"\bKZ\d{2}[A-Z0-9]{16}\b", re.IGNORECASE)
DOC_NUMBER_RE = re.compile(r"\b\d{9}\b")


@dataclass
class FieldResult:
    value: str = ""
    confidence: str = "missing"  # high | medium | low | missing
    raw_candidates: list[str] = field(default_factory=list)


@dataclass
class ExtractionResult:
    doc_type: str = "other"
    doc_type_confidence: str = "low"
    fields: dict[str, FieldResult] = field(default_factory=dict)
    iin_candidates: list[str] = field(default_factory=list)
    raw_text_len: int = 0


# --- document type classification -------------------------------------------

_DOC_TYPE_KEYWORDS = {
    "id_card": ["жеке куәлік", "удостоверение личности", "identity card", "куәлік"],
    "passport": ["паспорт", "passport", "төлқұжат"],
    "address_proof": [
        "тіркелген мекенжайы", "адресная справка", "регистрац",
        "мекенжай туралы", "справка о месте жительства",
    ],
    "pension_doc": [
        "енпф", "единый накопительный пенсионный фонд", "бірыңғай жинақтаушы зейнетақы",
        "выписка", "пенсионные накопления", "зейнетақы жинақ",
    ],
    "bank_details": ["реквизит", "iban", "swift", "банковский счет", "банктік шот"],
}


def classify_document_type(text: str) -> tuple[str, str]:
    low = text.lower()
    scores = {doc_type: sum(1 for kw in kws if kw in low) for doc_type, kws in _DOC_TYPE_KEYWORDS.items()}
    scores = {k: v for k, v in scores.items() if v}
    if not scores:
        return "other", "low"
    best = max(scores, key=scores.get)
    return best, ("high" if scores[best] >= 2 else "medium")


# --- IIN ------------------------------------------------------------------------

def find_iin_candidates(text: str) -> list[str]:
    """All 12-digit runs that also look like a *plausible* IIN (first 6
    digits form a real calendar date, 7th digit is a valid century/gender
    code 1-6). Order-preserving de-duplication."""
    seen: list[str] = []
    for m in IIN_RE.finditer(text):
        digits = m.group(1)
        if digits in seen:
            continue
        mm, dd, century_gender = digits[2:4], digits[4:6], digits[6]
        try:
            valid_date = 1 <= int(mm) <= 12 and 1 <= int(dd) <= 31
        except ValueError:
            valid_date = False
        if valid_date and century_gender in "123456":
            seen.append(digits)
    return seen


def iin_birth_date(iin: str) -> str | None:
    """Derive DD.MM.YYYY of birth from a validated 12-digit IIN."""
    if len(iin) != 12 or not iin.isdigit():
        return None
    yy, mm, dd, century_gender = int(iin[0:2]), int(iin[2:4]), int(iin[4:6]), int(iin[6])
    century = {1: 1800, 2: 1800, 3: 1900, 4: 1900, 5: 2000, 6: 2000}.get(century_gender)
    if century is None:
        return None
    year = century + yy
    try:
        date(year, mm, dd)
    except ValueError:
        return None
    return f"{dd:02d}.{mm:02d}.{year:04d}"


def iin_gender(iin: str) -> str:
    if len(iin) != 12 or not iin.isdigit():
        return ""
    code = int(iin[6])
    return "мужской" if code % 2 == 1 else "женский"


# --- labeled-field line scanning ------------------------------------------------

_LABELS: dict[str, list[str]] = {
    "last_name": [r"\bтегі\b", r"\bфамилия\b"],
    "first_name": [r"\bаты\b", r"\bимя\b"],
    "middle_name": [r"әкесінің аты", r"\bотчество\b"],
    "registration_address": [r"тіркелген мекенжайы", r"адрес регистрации"],
    "residential_address": [r"тұратын жері", r"место жительства", r"адрес прожив", r"\bмекенжайы\b"],
    "issued_by": [r"кім берген", r"берген орган", r"кем выдан", r"выдан[а-я]*\s*$", r"выдан[:\s]"],
    "issue_date_label": [r"беру күні", r"дата выдачи"],
    "document_number_label": [r"құжат (?:нөмірі|номер)", r"номер документа", r"№\s*документа", r"документ\s*№"],
    "phone_label": [r"\bтелефон\b", r"тел\."],
    "bank_name": [r"банк[іi]?\s*атауы", r"наименование банка", r"банктің атауы"],
}


def _scan_labeled_lines(text: str) -> dict[str, str]:
    """For each known label, grab whatever follows it on the same line
    (after ':' or the label itself), falling back to the next non-empty
    line. Only ever returns text that was actually adjacent to the label -
    nothing is inferred."""
    lines = [ln.strip() for ln in text.splitlines()]
    found: dict[str, str] = {}
    for field_name, patterns in _LABELS.items():
        for i, line in enumerate(lines):
            low = line.lower()
            for pat in patterns:
                m = re.search(pat, low)
                if not m:
                    continue
                # Lines often carry a bilingual label ("Тегі / Фамилия:
                # ИВАНОВ") - the value sits after the LAST colon on the
                # line, not right after whichever label happened to match.
                last_colon = line.rfind(":")
                tail = (line[last_colon + 1:] if last_colon >= m.start() else line[m.end():]).lstrip(" :\t-–")
                if tail and not re.fullmatch(r"[\W_]*", tail):
                    found[field_name] = tail.strip()
                else:
                    for nxt in lines[i + 1: i + 3]:
                        if nxt and not re.fullmatch(r"[\W_]*", nxt):
                            found[field_name] = nxt.strip()
                            break
                break
            if field_name in found:
                break
    return found


def extract_fields(text: str) -> ExtractionResult:
    result = ExtractionResult(raw_text_len=len(text))
    if not text.strip():
        return result

    result.doc_type, result.doc_type_confidence = classify_document_type(text)

    iins = find_iin_candidates(text)
    result.iin_candidates = iins
    if len(iins) == 1:
        result.fields["iin"] = FieldResult(iins[0], "high", iins)
        bd = iin_birth_date(iins[0])
        if bd:
            result.fields["birth_date"] = FieldResult(bd, "high")
        gender = iin_gender(iins[0])
        if gender:
            result.fields["gender"] = FieldResult(gender, "high")
    elif len(iins) > 1:
        result.fields["iin"] = FieldResult("", "low", iins)  # needs manual pick

    labeled = _scan_labeled_lines(text)
    for key in ("last_name", "first_name", "middle_name", "registration_address", "residential_address", "issued_by", "bank_name"):
        if key in labeled:
            result.fields[key] = FieldResult(labeled[key], "high")

    if "last_name" in result.fields or "first_name" in result.fields:
        last = result.fields.get("last_name", FieldResult()).value
        first = result.fields.get("first_name", FieldResult()).value
        middle = result.fields.get("middle_name", FieldResult()).value
        full = " ".join(p for p in (last, first, middle) if p)
        if full:
            result.fields["full_name"] = FieldResult(full, "high")

    if "issue_date_label" in labeled:
        m = DATE_RE.search(labeled["issue_date_label"])
        if m:
            d, mo, y = (int(x) for x in m.groups())
            result.fields["issue_date"] = FieldResult(f"{d:02d}.{mo:02d}.{y:04d}", "high")

    if "document_number_label" in labeled:
        m = re.search(r"\d[\d\s]{6,}\d", labeled["document_number_label"])
        if m:
            result.fields["document_number"] = FieldResult(re.sub(r"\s", "", m.group()), "high")
    else:
        m = DOC_NUMBER_RE.search(text)
        if m and m.group() not in iins:
            result.fields["document_number"] = FieldResult(m.group(), "medium", [m.group()])

    m = EMAIL_RE.search(text)
    if m:
        result.fields["email"] = FieldResult(m.group(), "high")

    m = PHONE_RE.search(text)
    if m:
        result.fields["phone"] = FieldResult(re.sub(r"[\s\-()]", "", m.group()), "high")

    m = IBAN_RE.search(text)
    if m:
        result.fields["iban"] = FieldResult(m.group().upper(), "high")

    if "residential_address" not in result.fields:
        # loose fallback: a line mentioning "Казахстан" or a Kazakh city and
        # street-like tokens (дом/кв/ул) is a *medium* confidence address
        # guess - never auto-accepted, always shown for manager review.
        for ln in text.splitlines():
            low = ln.lower()
            if "казахстан" in low and any(tok in low for tok in ("ул.", "улица", "мкр", "дом", "кв.", "проспект", "көше")):
                result.fields["residential_address"] = FieldResult(ln.strip(), "medium")
                break

    return result
