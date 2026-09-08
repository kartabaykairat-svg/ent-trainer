"""Pre-generation validation (project brief section 13 / 27).

Runs against the *data*, before any DOCX is touched. Returns a list of
human-readable error strings in Russian - if non-empty, the frontend must
block "Сформировать документы" / "Скачать" and show them to the manager.
"""
import re

from app.schemas import ClientData

_FORBIDDEN_LITERAL_PATTERNS = [
    (re.compile(r"\{\{.*?\}\}"), "шаблонный тег {{...}}"),
    (re.compile(r"undefined", re.IGNORECASE), "'undefined'"),
    (re.compile(r"\bnull\b", re.IGNORECASE), "'null'"),
    (re.compile(r"\bNone\b"), "'None'"),
    (re.compile(r"\[ФИО\]", re.IGNORECASE), "'[ФИО]'"),
    (re.compile(r"_{4,}"), "незаполненная последовательность подчёркиваний '____'"),
]


def _check_forbidden_literals(value: str, field_label: str, errors: list[str]) -> None:
    for pat, label in _FORBIDDEN_LITERAL_PATTERNS:
        if pat.search(value or ""):
            errors.append(f"Поле «{field_label}» содержит недопустимое значение ({label}).")


def _valid_iin(iin: str) -> bool:
    return bool(re.fullmatch(r"\d{12}", iin or ""))


def _valid_date(value: str) -> bool:
    return bool(re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", value or ""))


def pre_generation_validate(client: ClientData) -> list[str]:
    errors: list[str] = []

    def person_checks(person, label: str):
        if not person.full_name.strip():
            errors.append(f"{label}: не заполнено ФИО.")
        else:
            _check_forbidden_literals(person.full_name, f"{label} ФИО", errors)
        if not _valid_iin(person.iin):
            errors.append(f"{label}: ИИН не заполнен или не состоит из 12 цифр.")
        if not _valid_date(person.birth_date):
            errors.append(f"{label}: дата рождения не заполнена или имеет неверный формат (ДД.ММ.ГГГГ).")
        if not (person.residential_address or person.registration_address).strip():
            errors.append(f"{label}: адрес (регистрации или проживания) не заполнен.")
        if not person.document.number.strip():
            errors.append(f"{label}: номер документа, удостоверяющего личность, не заполнен.")
        if not person.document.issue_date.strip():
            errors.append(f"{label}: дата выдачи документа не заполнена.")

    person_checks(client.c1, "Первый страхователь")
    if client.second_insurer:
        person_checks(client.c2, "Второй страхователь")

    unresolved = [c for c in client.conflicts if not c.resolved]
    if unresolved:
        errors.append(
            f"Есть неразрешённые противоречия в данных ({len(unresolved)}) - "
            "выберите правильное значение для каждого поля перед формированием документов."
        )

    ins = client.insurance
    if not ins.contract_number.strip():
        errors.append("Параметры страхования: не заполнен номер договора.")
    if not _valid_date(ins.contract_date):
        errors.append("Параметры страхования: не заполнена или некорректна дата договора.")
    if not ins.contract_city.strip():
        errors.append("Параметры страхования: не заполнен город заключения договора.")
    if not (ins.premium_other_org_c1 or ins.premium_enpf_c1 or ins.premium_own_c1):
        errors.append("Параметры страхования: не заполнена ни одна составляющая страховой премии первого страхователя.")
    if not ins.first_payment_c1.strip():
        errors.append("Параметры страхования: не заполнен размер первой страховой выплаты для первого застрахованного.")
    if client.second_insurer and not ins.first_payment_c2.strip():
        errors.append("Параметры страхования: не заполнен размер первой страховой выплаты для второго застрахованного.")

    if not client.manager_confirmed:
        errors.append("Данные клиента ещё не подтверждены менеджером (кнопка «Подтвердить данные клиента»).")

    # scan every string field for forbidden literals, defensively, in case
    # a manager typed one of these by hand.
    for path, value in _iter_string_fields(client):
        if isinstance(value, str) and value:
            _check_forbidden_literals(value, path, errors)

    # de-duplicate while preserving order
    seen = set()
    unique_errors = []
    for e in errors:
        if e not in seen:
            seen.add(e)
            unique_errors.append(e)
    return unique_errors


def _iter_string_fields(model, prefix=""):
    dumped = model.model_dump()

    def walk(obj, path):
        if isinstance(obj, dict):
            for k, v in obj.items():
                yield from walk(v, f"{path}.{k}" if path else k)
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                yield from walk(v, f"{path}[{i}]")
        elif isinstance(obj, str):
            yield path, obj

    yield from walk(dumped, prefix)
