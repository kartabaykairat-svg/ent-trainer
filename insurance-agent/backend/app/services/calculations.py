"""Pension-annuity calculation module.

Only ever does two kinds of math:
  1. Pure calendar arithmetic (age, years-to-target-age) - always safe,
     never configurable, never wrong.
  2. Payment-amount formulas loaded from app/config/calc_config.yaml - see
     that file for why this is deliberately NOT hard-coded. If the
     requested formula id is missing/disabled, this module returns a
     CalculationResult full of warnings and no computed amounts rather
     than guessing - the frontend must then ask the manager to enter the
     amounts manually.
"""
from datetime import date, datetime

import yaml

from app.config import get_settings
from app.schemas import CalculationInput, CalculationResult
from app.services.text_utils import parse_ddmmyyyy


def _load_config() -> dict:
    settings = get_settings()
    if not settings.calc_config_path.exists():
        return {"formulas": [], "active_formula": None}
    with open(settings.calc_config_path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def list_formulas() -> list[dict]:
    return _load_config().get("formulas", [])


def _age_on(birth: tuple[int, int, int], on: tuple[int, int, int]) -> int:
    bd, bm, by = birth
    od, om, oy = on
    age = oy - by
    if (om, od) < (bm, bd):
        age -= 1
    return age


def calc_manual_reference_estimate(premium_total: float, years_to_target: int) -> float | None:
    """Illustrative only - see calc_config.yaml. premium / (years*12)."""
    if not years_to_target or years_to_target <= 0:
        return None
    return round(premium_total / (years_to_target * 12), 2)


_FORMULA_FUNCS = {
    "manual_reference_estimate": calc_manual_reference_estimate,
}


def calculate(inputs: CalculationInput, *, birth_date_c1: str, birth_date_c2: str = "", premium_c1: float = 0, premium_c2: float = 0) -> CalculationResult:
    calc_date = parse_ddmmyyyy(inputs.calculation_date) or (datetime.today().day, datetime.today().month, datetime.today().year)
    result = CalculationResult(
        formula_id=inputs.formula_id,
        computed_at=f"{calc_date[0]:02d}.{calc_date[1]:02d}.{calc_date[2]:04d}",
        inputs_echo=inputs.model_dump(),
    )

    b1 = parse_ddmmyyyy(birth_date_c1)
    if b1:
        result.age_c1 = _age_on(b1, calc_date)
        if inputs.target_retirement_age:
            result.years_to_target_c1 = max(inputs.target_retirement_age - result.age_c1, 0)
    else:
        result.warnings.append("Дата рождения первого страхователя не заполнена или некорректна - возраст не рассчитан.")

    b2 = parse_ddmmyyyy(birth_date_c2) if birth_date_c2 else None
    if b2:
        result.age_c2 = _age_on(b2, calc_date)
        if inputs.target_retirement_age:
            result.years_to_target_c2 = max(inputs.target_retirement_age - result.age_c2, 0)

    if not inputs.formula_id:
        result.warnings.append(
            "Формула расчёта суммы выплаты не выбрана. Введите суммы страховых "
            "выплат вручную в разделе «Параметры страхования» или выберите "
            "формулу в конфигурации (app/config/calc_config.yaml)."
        )
        return result

    config = _load_config()
    formula_cfg = next((f for f in config.get("formulas", []) if f["id"] == inputs.formula_id), None)
    if not formula_cfg or not formula_cfg.get("enabled"):
        result.warnings.append(
            f"Формула '{inputs.formula_id}' не найдена или отключена в конфигурации. "
            "Ни одна сумма не была рассчитана автоматически - введите значения вручную."
        )
        return result

    func = _FORMULA_FUNCS.get(inputs.formula_id)
    if not func:
        result.warnings.append(f"Для формулы '{inputs.formula_id}' не реализована функция расчёта.")
        return result

    if formula_cfg["id"] == "manual_reference_estimate":
        result.warnings.append(
            "Использована справочная (не сертифицированная) формула расчёта - "
            "результат требует проверки актуарием перед использованием в договоре."
        )
        if result.years_to_target_c1:
            v = func(premium_c1, result.years_to_target_c1)
            if v is not None:
                result.monthly_payment_c1 = f"{v:,.2f}".replace(",", " ")
        if result.years_to_target_c2 and premium_c2:
            v = func(premium_c2, result.years_to_target_c2)
            if v is not None:
                result.monthly_payment_c2 = f"{v:,.2f}".replace(",", " ")

    return result
