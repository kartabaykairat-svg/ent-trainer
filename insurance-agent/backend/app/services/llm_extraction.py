"""Optional LLM-assisted structured extraction.

Only used when ANTHROPIC_API_KEY is configured (app/config.py). The
deterministic regex/label extractor in extraction.py always runs and is
never replaced by this - the LLM pass is a *second opinion* used to fill
gaps the regex pass missed (e.g. a name split across an odd OCR line
break) and its output is merged field-by-field, never wholesale, and
always at "medium" confidence at best (never "high") since it wasn't
verified against an exact structural match.

Every value returned by the model must be traceable to the supplied OCR
text - the tool call schema below forces the model to only emit fields it
can literally quote/paraphrase from the text (via `evidence`) rather than
inferring, and the system prompt explicitly forbids invented values.
"""
import json
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)

TOOL_SCHEMA = {
    "name": "extracted_client_fields",
    "description": "Structured fields found verbatim in the supplied OCR text of a Kazakhstani identity/address document.",
    "input_schema": {
        "type": "object",
        "properties": {
            "last_name": {"type": "string"},
            "first_name": {"type": "string"},
            "middle_name": {"type": "string"},
            "birth_date": {"type": "string", "description": "DD.MM.YYYY, empty if not present in the text"},
            "iin": {"type": "string", "description": "12 digits, empty if not present or ambiguous"},
            "registration_address": {"type": "string"},
            "residential_address": {"type": "string"},
            "document_type": {"type": "string"},
            "document_number": {"type": "string"},
            "document_series": {"type": "string"},
            "issue_date": {"type": "string", "description": "DD.MM.YYYY"},
            "issued_by": {"type": "string"},
            "phone": {"type": "string"},
            "email": {"type": "string"},
            "bank_name": {"type": "string"},
            "bank_account": {"type": "string"},
            "evidence": {
                "type": "object",
                "description": "For every non-empty field above, the exact substring of the input text it was taken from.",
                "additionalProperties": {"type": "string"},
            },
        },
        "required": ["evidence"],
    },
}

SYSTEM_PROMPT = (
    "You extract structured personal-data fields from OCR text of Kazakhstani "
    "identity, address and pension documents for an insurance manager's review "
    "tool. Only ever return a value that is copied verbatim (or trivially "
    "reformatted, e.g. normalizing a date to DD.MM.YYYY) from the supplied "
    "text. Never guess, infer, autocomplete, or fill in a value that is not "
    "literally present in the text - leave the field empty instead. For every "
    "field you fill, put the exact source snippet in `evidence`. If the OCR "
    "text contains more than one plausible IIN, leave the `iin` field empty."
)


def is_available() -> bool:
    return bool(get_settings().anthropic_api_key)


def extract_with_llm(ocr_text: str) -> dict | None:
    """Returns the tool_use input dict, or None if unavailable/failed."""
    if not is_available() or not ocr_text.strip():
        return None
    try:
        import anthropic
    except ImportError:
        logger.warning("anthropic package not installed; skipping LLM extraction")
        return None

    settings = get_settings()
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=[TOOL_SCHEMA],
            tool_choice={"type": "tool", "name": "extracted_client_fields"},
            messages=[{"role": "user", "content": f"OCR text:\n\n{ocr_text[:12000]}"}],
        )
    except Exception:
        logger.exception("LLM extraction call failed")
        return None

    for block in response.content:
        if block.type == "tool_use":
            return block.input
    return None


def merge_llm_fields(base_fields: dict, llm_output: dict | None) -> dict:
    """Merge LLM-found values into an existing {field: FieldResult}-shaped
    dict (see extraction.ExtractionResult.fields) WITHOUT overwriting any
    field the deterministic pass already found. LLM-only fields are
    inserted at "medium" confidence and must still pass manager review."""
    from app.services.extraction import FieldResult

    if not llm_output:
        return base_fields
    evidence = llm_output.get("evidence", {}) or {}
    key_map = {
        "last_name": "last_name", "first_name": "first_name", "middle_name": "middle_name",
        "birth_date": "birth_date", "iin": "iin",
        "registration_address": "registration_address", "residential_address": "residential_address",
        "document_number": "document_number", "issue_date": "issue_date", "issued_by": "issued_by",
        "phone": "phone", "email": "email", "bank_name": "bank_name", "bank_account": "iban",
    }
    merged = dict(base_fields)
    for llm_key, field_key in key_map.items():
        value = (llm_output.get(llm_key) or "").strip()
        if not value or field_key in merged:
            continue
        if llm_key not in evidence or evidence[llm_key].strip() == "":
            continue  # no evidence quoted - refuse to trust it
        merged[field_key] = FieldResult(value=value, confidence="medium", raw_candidates=[value])
    return merged
