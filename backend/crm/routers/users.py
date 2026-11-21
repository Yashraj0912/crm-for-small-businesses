from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import schemas as s
from .. import mail
from ..crud import get_or_404
from ..deps import admin_user, current_user, get_db
from ..models import Activity, User
from ..security import hash_password

router = APIRouter(prefix="/users", tags=["team"])


@router.get("", response_model=list[s.UserOut])
def list_users(user: User = Depends(current_user), db: Session = Depends(get_db)):
    users = db.execute(select(User).where(User.org_id == user.org_id).order_by(User.name)).scalars().all()
    since = datetime.now(timezone.utc) - timedelta(days=30)
    counts = dict(db.execute(
        select(Activity.user_id, func.count()).where(Activity.org_id == user.org_id, Activity.created_at >= since)
        .group_by(Activity.user_id)
    ).all())
    out = []
    for u in users:
        o = s.UserOut.model_validate(u)
        o.activities_30d = counts.get(u.id, 0)
        out.append(o)
    return out


@router.post("", response_model=s.UserOut, status_code=201)
def create_user(body: s.UserCreate, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    u = User(org_id=admin.org_id, email=email, name=body.name, role=body.role, password_hash=hash_password(body.password))
    db.add(u)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email already registered")
    db.refresh(u)
    mail.notify_welcome(u, admin)
    return u


@router.put("/{user_id}", response_model=s.UserOut)
def update_user(user_id: int, body: s.UserUpdate, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    u = get_or_404(db, User, user_id, admin.org_id)
    if u.id == admin.id and (body.role != "admin" or not body.is_active):
        raise HTTPException(400, "You cannot remove your own admin access")
    u.name, u.role, u.is_active = body.name, body.role, body.is_active
    if body.password:
        u.password_hash = hash_password(body.password)
    db.commit()
    return get_or_404(db, User, user_id, admin.org_id)
