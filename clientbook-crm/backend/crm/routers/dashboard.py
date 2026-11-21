from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, literal_column, select
from sqlalchemy.orm import Session

from .. import schemas as s
from ..deps import current_user, get_db
from ..models import Activity, Customer, Deal, Lead, Task, User

router = APIRouter(tags=["dashboard"])
STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"]


def _month_start(d: date, back: int) -> date:
    y, m = d.year, d.month - back
    while m < 1:
        m, y = m + 12, y - 1
    return date(y, m, 1)


@router.get("/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    org = user.org_id
    now = datetime.now(timezone.utc)
    today = now.date()

    def cnt(model, *conds):
        return select(func.count()).select_from(model).where(model.org_id == org, *conds).scalar_subquery()

    # One round-trip for all counters (Neon latency matters).
    row = db.execute(select(
        cnt(Customer).label("customers"),
        cnt(Customer, Customer.created_at >= now - timedelta(days=30)).label("new_customers"),
        cnt(Lead).label("leads"),
        cnt(Lead, Lead.status.in_(("new", "contacted", "qualified"))).label("open_leads"),
        cnt(Deal, Deal.stage.notin_(("won", "lost"))).label("active_deals"),
        cnt(Task, Task.status == "pending").label("pending_tasks"),
        cnt(Task, Task.status == "pending", Task.due_date < today).label("overdue_tasks"),
        cnt(Task, Task.status == "pending", Task.due_date == today).label("due_today"),
    )).one()._mapping

    pipe = {r[0]: (r[1], float(r[2])) for r in db.execute(
        select(Deal.stage, func.count(), func.coalesce(func.sum(Deal.value), 0))
        .where(Deal.org_id == org).group_by(Deal.stage)).all()}
    pipeline = [{"stage": st, "count": pipe.get(st, (0, 0.0))[0], "value": pipe.get(st, (0, 0.0))[1]} for st in STAGES]

    months = [_month_start(today, i) for i in range(5, -1, -1)]
    start = datetime(months[0].year, months[0].month, 1, tzinfo=timezone.utc)
    month_expr = func.date_trunc(literal_column("'month'"), Deal.closed_at)
    rev = {r[0].strftime("%Y-%m"): float(r[1]) for r in db.execute(
        select(month_expr, func.sum(Deal.value))
        .where(Deal.org_id == org, Deal.stage == "won", Deal.closed_at >= start).group_by(month_expr)).all()}

    acts = db.execute(select(Activity).where(Activity.org_id == org).order_by(Activity.created_at.desc()).limit(8)).scalars().all()
    tasks = db.execute(select(Task).where(Task.org_id == org, Task.status == "pending")
                       .order_by(Task.due_date.asc().nulls_last(), Task.id.desc()).limit(6)).scalars().all()

    return {
        "stats": dict(row),
        "pipeline": pipeline,
        "open_pipeline_value": sum(p["value"] for p in pipeline if p["stage"] not in ("won", "lost")),
        "revenue_won_total": pipe.get("won", (0, 0.0))[1],
        "revenue_by_month": [{"month": m.strftime("%Y-%m"), "revenue": rev.get(m.strftime("%Y-%m"), 0.0)} for m in months],
        "recent_activities": [s.ActivityOut.model_validate(a) for a in acts],
        "upcoming_tasks": [s.TaskOut.model_validate(t) for t in tasks],
    }
