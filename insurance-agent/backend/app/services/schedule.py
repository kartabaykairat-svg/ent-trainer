"""Payment schedule generator (Приложение 1 - График страховых выплат).

Purely mechanical: given a start date, periodicity, first payment amount
and (optionally, only if the manager has explicitly confirmed it - see
project brief section 10) an annual indexation rate, produces the list of
payment rows for the schedule table. It does NOT try to model an actuarial
buyout-sum decrement curve (that lives in the insurer's certified
actuarial engine, see calculations.py) - if the manager supplies an
initial buyout sum, it is only carried through unchanged/left for manual
per-row entry; nothing about its trajectory is invented.

The contract is nominally lifetime ("Шарт действует пожизненно"), so the
manager must supply how many years of the schedule to actually print
(`term_years`) - this is a printing convenience, not a claim about the
contract's real duration.
"""
from dataclasses import dataclass
from datetime import date

from dateutil.relativedelta import relativedelta

from app.schemas import ScheduleItem
from app.services.text_utils import parse_ddmmyyyy

PERIODICITY_MONTHS = {
    "ежемесячно": 1,
    "ежеквартально": 3,
    "раз в полгода": 6,
    "ежегодно": 12,
}


@dataclass
class SchedulePersonInput:
    start_date: str            # DD.MM.YYYY
    periodicity: str           # one of PERIODICITY_MONTHS keys
    initial_amount: float
    term_years: int
    indexation_percent: float = 0.0
    indexation_confirmed: bool = False
    initial_buyout: float | None = None


def _generate_single(inp: SchedulePersonInput) -> list[tuple[str, str, str]]:
    parsed = parse_ddmmyyyy(inp.start_date)
    if not parsed or inp.term_years <= 0:
        return []
    d, m, y = parsed
    step = PERIODICITY_MONTHS.get(inp.periodicity, 1)
    current = date(y, m, d)
    end = current + relativedelta(years=inp.term_years)

    rows = []
    amount = inp.initial_amount
    buyout = inp.initial_buyout
    year_marker = current.year
    while current < end:
        if inp.indexation_confirmed and current.year != year_marker:
            amount = round(amount * (1 + inp.indexation_percent / 100), 2)
            year_marker = current.year
        amount_str = f"{amount:,.0f}".replace(",", " ")
        buyout_str = f"{buyout:,.0f}".replace(",", " ") if buyout is not None else ""
        rows.append((current.strftime("%d.%m.%Y"), amount_str, buyout_str))
        current = current + relativedelta(months=step)
    return rows


def generate_schedule(
    c1: SchedulePersonInput | None,
    c2: SchedulePersonInput | None = None,
) -> list[ScheduleItem]:
    rows1 = _generate_single(c1) if c1 else []
    rows2 = _generate_single(c2) if c2 else []
    n = max(len(rows1), len(rows2))
    items = []
    for i in range(n):
        d1, a1, b1 = rows1[i] if i < len(rows1) else ("", "", "")
        d2, a2, b2 = rows2[i] if i < len(rows2) else ("", "", "")
        items.append(ScheduleItem(date_c1=d1, amount_c1=a1, buyout_c1=b1, date_c2=d2, amount_c2=a2, buyout_c2=b2))
    return items
