"""Lightweight id/name lists for dropdowns (one cheap query each)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import current_user, get_db
from ..models import Customer, Deal, User

router = APIRouter(prefix="/lookup", tags=["lookup"])


@router.get("/customers")
def customers(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.execute(select(Customer.id, Customer.name).where(Customer.org_id == user.org_id).order_by(Customer.name).limit(1000)).all()
    return [{"id": i, "name": n} for i, n in rows]


@router.get("/deals")
def deals(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.execute(select(Deal.id, Deal.title).where(Deal.org_id == user.org_id).order_by(Deal.created_at.desc()).limit(1000)).all()
    return [{"id": i, "name": n} for i, n in rows]
