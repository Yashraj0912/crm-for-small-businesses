from datetime import date, datetime
from decimal import Decimal
from typing import Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

T = TypeVar("T")
Stage = Literal["new", "qualified", "proposal", "negotiation", "won", "lost"]
LeadStatus = Literal["new", "contacted", "qualified", "unqualified"]


class In(BaseModel):
    """Input base: trims strings and turns blank strings into None."""
    model_config = ConfigDict(str_strip_whitespace=True)

    @model_validator(mode="before")
    @classmethod
    def blank_to_none(cls, v):
        if isinstance(v, dict):
            return {k: (None if isinstance(x, str) and not x.strip() else x) for k, x in v.items()}
        return v


class Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


# ---- auth / users
class RegisterIn(In):
    org_name: str = Field(min_length=1, max_length=200)
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginIn(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=200)


class UserOut(Out):
    id: int
    org_id: int
    org_name: Optional[str] = None
    name: str
    email: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    activities_30d: int = 0


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(In):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: Literal["admin", "employee"] = "employee"


class UserUpdate(In):
    name: str = Field(min_length=1, max_length=200)
    role: Literal["admin", "employee"] = "employee"
    is_active: bool = True
    password: Optional[str] = Field(default=None, min_length=8, max_length=72)


# ---- customers
class CustomerIn(In):
    name: str = Field(min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=200)
    job_title: Optional[str] = Field(default=None, max_length=100)
    category: Optional[str] = Field(default=None, max_length=50)
    tags: list[str] = Field(default_factory=list, max_length=20)
    address: Optional[str] = Field(default=None, max_length=1000)
    notes: Optional[str] = Field(default=None, max_length=10000)
    owner_id: Optional[int] = None

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, v):
        return list(dict.fromkeys(t.strip()[:50] for t in v if t and t.strip()))


class CustomerOut(Out):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    category: Optional[str] = None
    tags: list[str] = []
    address: Optional[str] = None
    notes: Optional[str] = None
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    created_at: datetime


# ---- leads
class LeadIn(In):
    name: str = Field(min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=50)
    company: Optional[str] = Field(default=None, max_length=200)
    source: Optional[str] = Field(default=None, max_length=50)
    status: LeadStatus = "new"
    assigned_to: Optional[int] = None
    follow_up_date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=10000)


class LeadOut(Out):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    status: str
    assigned_to: Optional[int] = None
    assignee_name: Optional[str] = None
    follow_up_date: Optional[date] = None
    notes: Optional[str] = None
    converted_customer_id: Optional[int] = None
    created_at: datetime


# ---- deals
class DealIn(In):
    title: str = Field(min_length=1, max_length=200)
    value: Decimal = Field(default=Decimal(0), ge=0, max_digits=12, decimal_places=2)
    stage: Stage = "new"
    expected_close: Optional[date] = None
    customer_id: Optional[int] = None
    owner_id: Optional[int] = None
    notes: Optional[str] = Field(default=None, max_length=10000)


class StageIn(BaseModel):
    stage: Stage


class DealOut(Out):
    id: int
    title: str
    value: float
    stage: str
    expected_close: Optional[date] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    notes: Optional[str] = None
    closed_at: Optional[datetime] = None
    created_at: datetime


# ---- tasks
class TaskIn(In):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    due_date: Optional[date] = None
    priority: Literal["low", "medium", "high"] = "medium"
    status: Literal["pending", "done"] = "pending"
    assigned_to: Optional[int] = None
    customer_id: Optional[int] = None
    deal_id: Optional[int] = None


class TaskOut(Out):
    id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: str
    status: str
    assigned_to: Optional[int] = None
    assignee_name: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    deal_id: Optional[int] = None
    deal_title: Optional[str] = None
    completed_at: Optional[datetime] = None


# ---- activities
class ActivityIn(In):
    type: Literal["call", "meeting", "email", "note"]
    subject: str = Field(min_length=1, max_length=200)
    body: Optional[str] = Field(default=None, max_length=5000)
    customer_id: Optional[int] = None
    deal_id: Optional[int] = None


class ActivityOut(Out):
    id: int
    type: str
    subject: str
    body: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    deal_id: Optional[int] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    created_at: datetime
