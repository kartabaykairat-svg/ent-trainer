from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_manager
from app.models import Client, Manager

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(manager: Manager = Depends(get_current_manager), db: Session = Depends(get_db)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    base = db.query(Client).filter(Client.manager_id == manager.id)
    clients_today = base.filter(Client.created_at >= today_start).count()
    contracts_generated = base.filter(Client.contract_generated.is_(True)).count()
    poa_generated = base.filter(Client.poa_generated.is_(True)).count()
    needs_review = base.filter(Client.needs_review.is_(True)).count()
    ocr_errors = base.filter(Client.ocr_error_count > 0).count()

    return {
        "clients_today": clients_today,
        "contracts_generated": contracts_generated,
        "poa_generated": poa_generated,
        "needs_review": needs_review,
        "recognition_errors": ocr_errors,
        "total_clients": base.count(),
    }
