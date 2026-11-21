from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import schemas as s
from ..crud import get_or_404, make_crud
from ..deps import current_user, get_db
from ..models import Activity, Customer, Deal, Lead, Task, User


def _now():
    return datetime.now(timezone.utc)


customers = make_crud(
    "customers", Customer, s.CustomerIn, s.CustomerOut,
    search=(Customer.name, Customer.email, Customer.company, func.array_to_string(Customer.tags, " ")),
    filters=("category", "owner_id"), sort=(Customer.created_at.desc(),),
    refs={"owner_id": User}, admin_delete=True, notify_kind="customer", notify_fields=("owner_id",),
    on_create=lambda u, d: {"owner_id": d.get("owner_id") or u.id},
    extra_filter=lambda p: [Customer.tags.any(p["tag"])] if p.get("tag") else [],
)


def _lead_hook(data, obj):
    if obj is not None and obj.status == "converted":
        data["status"] = "converted"


leads = make_crud(
    "leads", Lead, s.LeadIn, s.LeadOut,
    search=(Lead.name, Lead.email, Lead.company), filters=("status", "source", "assigned_to"),
    sort=(Lead.created_at.desc(),), refs={"assigned_to": User}, admin_delete=True, before_save=_lead_hook, notify_kind="lead", notify_fields=("assigned_to",),
)


def _deal_hook(data, obj):
    if data["stage"] not in ("won", "lost"):
        data["closed_at"] = None
    elif obj is not None and obj.closed_at and obj.stage == data["stage"]:
        data["closed_at"] = obj.closed_at
    else:
        data["closed_at"] = _now()


deals = make_crud(
    "deals", Deal, s.DealIn, s.DealOut, search=(Deal.title,),
    filters=("stage", "customer_id", "owner_id"), sort=(Deal.created_at.desc(),),
    refs={"customer_id": Customer, "owner_id": User}, admin_delete=True, max_page=300, before_save=_deal_hook, notify_kind="deal", notify_fields=("owner_id",),
)


def _task_hook(data, obj):
    if data["status"] != "done":
        data["completed_at"] = None
    else:
        data["completed_at"] = obj.completed_at if obj is not None and obj.completed_at else _now()


tasks = make_crud(
    "tasks", Task, s.TaskIn, s.TaskOut, search=(Task.title,),
    filters=("status", "priority", "assigned_to", "customer_id", "deal_id"),
    sort=(Task.status.desc(), Task.due_date.asc().nulls_last()),
    refs={"assigned_to": User, "customer_id": Customer, "deal_id": Deal}, before_save=_task_hook,
    notify_kind="task", notify_fields=("assigned_to",),
)

activities = make_crud(
    "activities", Activity, s.ActivityIn, s.ActivityOut, search=(Activity.subject,),
    filters=("type", "customer_id", "deal_id", "user_id"), sort=(Activity.created_at.desc(),),
    refs={"customer_id": Customer, "deal_id": Deal}, on_create=lambda u, d: {"user_id": u.id},
)

extra = APIRouter()


@extra.post("/leads/{item_id}/convert", response_model=s.CustomerOut, status_code=201, tags=["leads"])
def convert_lead(item_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    lead = get_or_404(db, Lead, item_id, user.org_id)
    if lead.status == "converted":
        raise HTTPException(409, "Lead already converted")
    c = Customer(
        org_id=user.org_id, name=lead.name, email=lead.email, phone=lead.phone, company=lead.company,
        category="Customer", tags=[lead.source] if lead.source else [], notes=lead.notes,
        owner_id=lead.assigned_to or user.id,
    )
    db.add(c)
    db.flush()
    lead.status, lead.converted_customer_id, lead.updated_at = "converted", c.id, _now()
    db.add(Activity(org_id=user.org_id, type="note", subject="Converted from lead", customer_id=c.id, user_id=user.id))
    db.commit()
    return get_or_404(db, Customer, c.id, user.org_id)


@extra.patch("/deals/{item_id}/stage", response_model=s.DealOut, tags=["deals"])
def move_deal(item_id: int, body: s.StageIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    deal = get_or_404(db, Deal, item_id, user.org_id)
    data = {"stage": body.stage}
    _deal_hook(data, deal)
    deal.stage, deal.closed_at, deal.updated_at = data["stage"], data["closed_at"], _now()
    db.commit()
    return get_or_404(db, Deal, item_id, user.org_id)


@extra.post("/tasks/{item_id}/toggle", response_model=s.TaskOut, tags=["tasks"])
def toggle_task(item_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = get_or_404(db, Task, item_id, user.org_id)
    t.status = "pending" if t.status == "done" else "done"
    t.completed_at = _now() if t.status == "done" else None
    t.updated_at = _now()
    db.commit()
    return get_or_404(db, Task, item_id, user.org_id)


routers = [customers, leads, deals, tasks, activities, extra]
