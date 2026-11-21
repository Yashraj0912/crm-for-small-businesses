"""Emails via SMTP (Gmail with an app password by default). Best-effort: failures are logged and never break a request."""
import html
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

from .models import User

log = logging.getLogger("crm.mail")
LABELS = {"task": "task", "lead": "lead", "deal": "deal", "customer": "customer"}


def send_email(to: str, subject: str, text: str, html_body: str | None = None) -> bool:
    user, password = os.getenv("SMTP_USER"), (os.getenv("SMTP_PASSWORD") or "").replace(" ", "")
    if not user or not password:
        return False
    host, port = os.getenv("SMTP_HOST", "smtp.gmail.com"), int(os.getenv("SMTP_PORT", "465"))
    sender = os.getenv("MAIL_FROM") or f"Clientbook <{user}>"
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = sender, to, " ".join(subject.split())
    msg.set_content(text)
    if html_body:
        msg.add_alternative(html_body, subtype="html")
    ctx = ssl.create_default_context()
    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=8, context=ctx) as s:
                s.login(user, password)
                s.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=8) as s:
                s.starttls(context=ctx)
                s.login(user, password)
                s.send_message(msg)
        return True
    except Exception as e:  # noqa: BLE001
        log.warning("Email send failed: %s", e)
        return False


def _base_url() -> str:
    url = os.getenv("APP_URL") or (f"https://{os.getenv('VERCEL_PROJECT_PRODUCTION_URL')}" if os.getenv("VERCEL_PROJECT_PRODUCTION_URL") else "")
    return url.rstrip("/")


def _describe(kind: str, o):
    if kind == "task":
        return o.title, [("Task", o.title), ("Due", o.due_date or "No due date"), ("Priority", o.priority), ("Customer", o.customer_name or "None")], "/tasks"
    if kind == "lead":
        return o.name, [("Lead", o.name), ("Company", o.company or "None"), ("Follow-up", o.follow_up_date or "Not set"), ("Status", o.status)], "/leads"
    if kind == "deal":
        return o.title, [("Deal", o.title), ("Value", f"${o.value:,.0f}"), ("Customer", o.customer_name or "None"), ("Expected close", o.expected_close or "Not set")], "/deals"
    return o.name, [("Customer", o.name), ("Company", o.company or "None")], f"/customers/{o.id}"


def notify_assigned(db, kind: str, obj, assignee_id, actor: User) -> None:
    """Emails the new assignee. Skips self-assignment, inactive users, opted-out users and other organizations."""
    try:
        if not assignee_id or assignee_id == actor.id:
            return
        to = db.get(User, assignee_id)
        if not to or not to.is_active or not to.notify_email or to.org_id != actor.org_id:
            return
        title, rows, path = _describe(kind, obj)
        link = _base_url() + path if _base_url() else ""
        subject = f"{kind.capitalize()} assigned to you: {title}"[:200]
        intro = f"{actor.name} assigned you a {LABELS[kind]}."
        text = intro + "\n\n" + "\n".join(f"{k}: {v}" for k, v in rows) + (f"\n\nOpen it: {link}" if link else "") + \
            "\n\nYou can turn these emails off from the account menu in Clientbook."
        trs = "".join(f"<tr><td style='padding:2px 12px 2px 0;color:#76736a'>{html.escape(k)}</td><td>{html.escape(str(v))}</td></tr>" for k, v in rows)
        btn = f"<p><a href='{html.escape(link)}' style='color:#1f6f5c'>Open in Clientbook</a></p>" if link else ""
        body = (f"<div style='font-family:Arial,sans-serif;font-size:14px;color:#2a2924'><p>{html.escape(intro)}</p>"
                f"<table>{trs}</table>{btn}<p style='color:#76736a;font-size:12px'>You can turn these emails off from the account menu in Clientbook.</p></div>")
        send_email(to.email, subject, text, body)
    except Exception as e:  # noqa: BLE001
        log.warning("Notification failed: %s", e)


def notify_welcome(new_user: User, temp_password: str, admin: User) -> None:
    """Tells a newly added team member how to sign in."""
    try:
        link = _base_url()
        org = admin.org_name or "Clientbook"
        intro = f"{admin.name} added you to {org} on Clientbook."
        rows = [("Email", new_user.email), ("Temporary password", temp_password)]
        text = intro + "\n\n" + (f"Sign in at: {link}\n" if link else "") + "\n".join(f"{k}: {v}" for k, v in rows) + \
            "\n\nAsk your administrator if you need your password changed."
        trs = "".join(f"<tr><td style='padding:2px 12px 2px 0;color:#76736a'>{html.escape(k)}</td><td>{html.escape(v)}</td></tr>" for k, v in rows)
        btn = f"<p><a href='{html.escape(link)}' style='color:#1f6f5c'>Sign in to Clientbook</a></p>" if link else ""
        body = (f"<div style='font-family:Arial,sans-serif;font-size:14px;color:#2a2924'><p>{html.escape(intro)}</p>"
                f"<table>{trs}</table>{btn}<p style='color:#76736a;font-size:12px'>Ask your administrator if you need your password changed.</p></div>")
        send_email(new_user.email, f"You were added to {org} on Clientbook", text, body)
    except Exception as e:  # noqa: BLE001
        log.warning("Welcome email failed: %s", e)
