"""Tenant-scoped CRUD router factory. Every query is filtered by the caller's org_id."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from . import mail
from .deps import admin_user, current_user, get_db
from .models import User
from .schemas import Page


def get_or_404(db: Session, Model, item_id: int, org_id: int):
    obj = db.execute(
        select(Model).where(Model.id == item_id, Model.org_id == org_id).execution_options(populate_existing=True)
    ).scalars().first()
    if not obj:
        raise HTTPException(404, f"{Model.__name__} not found")
    return obj


def check_refs(db: Session, org_id: int, data: dict, refs: dict):
    """Referenced rows (customer, user, deal...) must belong to the same organization."""
    for field, M in refs.items():
        v = data.get(field)
        if v is not None and not db.execute(select(M.id).where(M.id == v, M.org_id == org_id)).first():
            raise HTTPException(422, f"Invalid {field}")


def make_crud(name, Model, In, Out, *, search=(), filters=(), sort=(), refs=None, admin_delete=False,
              max_page=100, on_create=None, before_save=None, extra_filter=None, notify_kind=None, notify_fields=()):
    router = APIRouter(prefix=f"/{name}", tags=[name])
    refs = refs or {}
    PageOut = Page[Out]

    @router.get("", response_model=PageOut)
    def list_items(request: Request, page: int = Query(1, ge=1), page_size: int = Query(25, ge=1),
                   q: Optional[str] = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
        page_size = min(page_size, max_page)
        conds = [Model.org_id == user.org_id]
        for f in filters:
            v = request.query_params.get(f)
            if v not in (None, ""):
                col = getattr(Model, f)
                try:
                    v = col.type.python_type(v)
                except (ValueError, TypeError, NotImplementedError):
                    raise HTTPException(422, f"Invalid {f}")
                conds.append(col == v)
        if q and q.strip() and search:
            like = f"%{q.strip()[:100]}%"
            conds.append(or_(*[c.ilike(like) for c in search]))
        if extra_filter:
            conds += extra_filter(request.query_params)
        total = db.scalar(select(func.count()).select_from(Model).where(*conds)) or 0
        rows = db.execute(
            select(Model).where(*conds).order_by(*sort, Model.id.desc()).limit(page_size).offset((page - 1) * page_size)
        ).scalars().all()
        return {"items": rows, "total": total, "page": page, "page_size": page_size}

    @router.post("", response_model=Out, status_code=201)
    def create_item(body: In, user: User = Depends(current_user), db: Session = Depends(get_db)):
        data = body.model_dump()
        check_refs(db, user.org_id, data, refs)
        if before_save:
            before_save(data, None)
        if on_create:
            data.update(on_create(user, data))
        obj = Model(**data, org_id=user.org_id)
        db.add(obj)
        db.commit()
        obj = get_or_404(db, Model, obj.id, user.org_id)
        for f in notify_fields:
            mail.notify_assigned(db, notify_kind, obj, getattr(obj, f), user)
        return obj

    @router.get("/{item_id}", response_model=Out)
    def get_item(item_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
        return get_or_404(db, Model, item_id, user.org_id)

    @router.put("/{item_id}", response_model=Out)
    def update_item(item_id: int, body: In, user: User = Depends(current_user), db: Session = Depends(get_db)):
        obj = get_or_404(db, Model, item_id, user.org_id)
        data = body.model_dump()
        check_refs(db, user.org_id, data, refs)
        if before_save:
            before_save(data, obj)
        previous = {f: getattr(obj, f) for f in notify_fields}
        for k, v in data.items():
            setattr(obj, k, v)
        if hasattr(obj, "updated_at"):
            obj.updated_at = datetime.now(timezone.utc)
        db.commit()
        obj = get_or_404(db, Model, item_id, user.org_id)
        for f in notify_fields:
            if getattr(obj, f) != previous[f]:
                mail.notify_assigned(db, notify_kind, obj, getattr(obj, f), user)
        return obj

    @router.delete("/{item_id}", status_code=204)
    def delete_item(item_id: int, user: User = Depends(admin_user if admin_delete else current_user),
                    db: Session = Depends(get_db)):
        db.delete(get_or_404(db, Model, item_id, user.org_id))
        db.commit()
        return Response(status_code=204)

    return router
