import os
from datetime import datetime, timezone
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import schemas as s
from ..deps import current_user, get_db
from ..models import Organization, User
from ..security import create_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@lru_cache
def _dummy_hash() -> str:
    return hash_password("not-a-real-password")


@router.post("/register", response_model=s.TokenOut, status_code=201)
def register(body: s.RegisterIn, db: Session = Depends(get_db)):
    """Creates a new organization and its first admin user."""
    if os.getenv("ALLOW_REGISTRATION", "true").lower() != "true":
        raise HTTPException(403, "Registration is disabled")
    email = body.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    org = Organization(name=body.org_name)
    db.add(org)
    db.flush()
    user = User(org_id=org.id, email=email, name=body.name, password_hash=hash_password(body.password), role="admin")
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email already registered")
    db.refresh(user)
    return {"access_token": create_token(user), "token_type": "bearer", "user": user}


@router.post("/login", response_model=s.TokenOut)
def login(body: s.LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower().strip()))
    ok = verify_password(body.password, user.password_hash if user else _dummy_hash())
    if not user or not ok or not user.is_active:
        raise HTTPException(401, "Incorrect email or password")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return {"access_token": create_token(user), "token_type": "bearer", "user": user}


@router.get("/me", response_model=s.UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=s.UserOut)
def update_preferences(body: s.PrefsIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.notify_email = body.notify_email
    db.commit()
    db.refresh(user)
    return user
