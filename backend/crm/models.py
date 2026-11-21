from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _org():
    return mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"))


def _ref(table):
    return mapped_column(ForeignKey(f"{table}.id", ondelete="SET NULL"), nullable=True)


def _created():
    return mapped_column(DateTime(timezone=True), server_default=func.now())


def _name(rel):
    return property(lambda self: getattr(getattr(self, rel), "name", None) if getattr(self, rel) else None)


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = _created()


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = _org()
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), server_default="employee")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    notify_email: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = _created()
    org = relationship("Organization", lazy="joined")
    org_name = _name("org")


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = _org()
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    company: Mapped[Optional[str]] = mapped_column(String(200))
    job_title: Mapped[Optional[str]] = mapped_column(String(100))
    category: Mapped[Optional[str]] = mapped_column(String(50))
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(50)), server_default=text("'{}'"))
    address: Mapped[Optional[str]] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    owner_id: Mapped[Optional[int]] = _ref("users")
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _created()
    owner = relationship("User", lazy="joined")
    owner_name = _name("owner")


class Lead(Base):
    __tablename__ = "leads"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = _org()
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    company: Mapped[Optional[str]] = mapped_column(String(200))
    source: Mapped[Optional[str]] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), server_default="new")
    assigned_to: Mapped[Optional[int]] = _ref("users")
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    converted_customer_id: Mapped[Optional[int]] = _ref("customers")
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _created()
    assignee = relationship("User", lazy="joined")
    assignee_name = _name("assignee")


class Deal(Base):
    __tablename__ = "deals"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = _org()
    title: Mapped[str] = mapped_column(String(200))
    value: Mapped[Decimal] = mapped_column(Numeric(12, 2), server_default="0")
    stage: Mapped[str] = mapped_column(String(20), server_default="new")
    expected_close: Mapped[Optional[date]] = mapped_column(Date)
    customer_id: Mapped[Optional[int]] = _ref("customers")
    owner_id: Mapped[Optional[int]] = _ref("users")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _created()
    customer = relationship("Customer", lazy="joined")
    owner = relationship("User", lazy="joined")
    customer_name = _name("customer")
    owner_name = _name("owner")


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = _org()
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text)
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    priority: Mapped[str] = mapped_column(String(10), server_default="medium")
    status: Mapped[str] = mapped_column(String(10), server_default="pending")
    assigned_to: Mapped[Optional[int]] = _ref("users")
    customer_id: Mapped[Optional[int]] = _ref("customers")
    deal_id: Mapped[Optional[int]] = _ref("deals")
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created()
    updated_at: Mapped[datetime] = _created()
    assignee = relationship("User", lazy="joined")
    customer = relationship("Customer", lazy="joined")
    deal = relationship("Deal", lazy="joined")
    assignee_name = _name("assignee")
    customer_name = _name("customer")
    deal_title = property(lambda self: self.deal.title if self.deal else None)


class Activity(Base):
    __tablename__ = "activities"
    id: Mapped[int] = mapped_column(primary_key=True)
    org_id: Mapped[int] = _org()
    type: Mapped[str] = mapped_column(String(10))
    subject: Mapped[str] = mapped_column(String(200))
    body: Mapped[Optional[str]] = mapped_column(Text)
    customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"))
    deal_id: Mapped[Optional[int]] = _ref("deals")
    user_id: Mapped[Optional[int]] = _ref("users")
    created_at: Mapped[datetime] = _created()
    user = relationship("User", lazy="joined")
    customer = relationship("Customer", lazy="joined")
    user_name = _name("user")
    customer_name = _name("customer")


class AiUsage(Base):
    __tablename__ = "ai_usage"
    org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True)
    day: Mapped[date] = mapped_column(Date, primary_key=True, server_default=func.current_date())
    calls: Mapped[int] = mapped_column(Integer, server_default="0")
