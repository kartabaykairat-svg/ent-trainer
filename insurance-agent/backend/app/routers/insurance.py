from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.audit import log_action
from app.database import get_db
from app.deps import get_current_manager
from app.models import Client, Manager
from app.routers.clients import _get_client_or_404, _serialize
from app.schemas import (
    BeneficiaryData,
    CalculationInput,
    InsuranceParams,
    RepresentativeOverride,
)
from app.services.calculations import calculate, list_formulas
from app.services.client_service import get_client_data, save_client_data
from app.services.schedule import SchedulePersonInput, generate_schedule

router = APIRouter(prefix="/api/clients/{client_id}/insurance", tags=["insurance"])


@router.get("/formulas")
def get_formulas(manager: Manager = Depends(get_current_manager)):
    return list_formulas()


@router.put("")
def set_insurance_params(client_id: str, payload: InsuranceParams, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    data = get_client_data(client)
    data.insurance = payload
    save_client_data(client, data)
    db.commit()
    log_action(db, manager_id=manager.id, client_id=client_id, action="insurance_params_updated")
    return _serialize(client)


@router.put("/beneficiary")
def set_beneficiary(client_id: str, payload: BeneficiaryData, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    data = get_client_data(client)
    data.beneficiary = payload
    save_client_data(client, data)
    db.commit()
    return _serialize(client)


@router.put("/representative")
def set_representative(client_id: str, payload: dict, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    data = get_client_data(client)
    data.representative_override_enabled = bool(payload.get("enabled", False))
    if "representative" in payload:
        data.representative = RepresentativeOverride(**payload["representative"])
    save_client_data(client, data)
    db.commit()
    log_action(db, manager_id=manager.id, client_id=client_id, action="representative_override_set", detail=str(data.representative_override_enabled))
    return _serialize(client)


@router.post("/calculate")
def run_calculation(client_id: str, payload: CalculationInput, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    client = _get_client_or_404(db, client_id, manager)
    data = get_client_data(client)

    from app.services.text_utils import number_to_words_ru  # noqa: F401 (kept local to avoid unused import at module load)

    premium_c1 = float(_digits(data.insurance.premium_other_org_c1) + _digits(data.insurance.premium_enpf_c1) + _digits(data.insurance.premium_own_c1))
    premium_c2 = float(_digits(data.insurance.premium_other_org_c2) + _digits(data.insurance.premium_enpf_c2) + _digits(data.insurance.premium_own_c2))

    result = calculate(
        payload,
        birth_date_c1=data.c1.birth_date,
        birth_date_c2=data.c2.birth_date if data.second_insurer else "",
        premium_c1=premium_c1,
        premium_c2=premium_c2,
    )
    data.calculation = result
    save_client_data(client, data)
    db.commit()
    log_action(db, manager_id=manager.id, client_id=client_id, action="calculation_run", detail=payload.formula_id or "age_only")
    return {"result": result.model_dump(), "client": _serialize(client)}


def _digits(v: str) -> int:
    import re
    d = re.sub(r"[^\d]", "", v or "")
    return int(d) if d else 0


@router.post("/schedule")
def generate_payment_schedule(client_id: str, payload: dict, manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    """payload: {
      c1: {start_date, periodicity, initial_amount, term_years, indexation_percent, indexation_confirmed, initial_buyout},
      c2: {...} | null
    }"""
    client = _get_client_or_404(db, client_id, manager)
    data = get_client_data(client)

    def to_input(d: dict | None) -> SchedulePersonInput | None:
        if not d:
            return None
        return SchedulePersonInput(
            start_date=d.get("start_date", ""),
            periodicity=d.get("periodicity", "ежемесячно"),
            initial_amount=float(d.get("initial_amount") or 0),
            term_years=int(d.get("term_years") or 0),
            indexation_percent=float(d.get("indexation_percent") or 0),
            indexation_confirmed=bool(d.get("indexation_confirmed", False)),
            initial_buyout=float(d["initial_buyout"]) if d.get("initial_buyout") not in (None, "") else None,
        )

    c1_input = to_input(payload.get("c1"))
    c2_input = to_input(payload.get("c2")) if data.second_insurer else None
    if not c1_input:
        raise HTTPException(400, "Параметры графика для первого страхователя обязательны")

    schedule = generate_schedule(c1_input, c2_input)
    data.schedule = schedule
    save_client_data(client, data)
    db.commit()
    log_action(db, manager_id=manager.id, client_id=client_id, action="schedule_generated", detail=f"rows={len(schedule)}")
    return {"schedule": [s.model_dump() for s in schedule], "client": _serialize(client)}
