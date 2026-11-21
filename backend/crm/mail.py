
"""Secure, best-effort email notifications for Clientbook."""

import html
import logging
import os
import random
import re
import smtplib
import ssl
import time

from email.message import EmailMessage
from email.utils import parseaddr
from urllib.parse import quote, urlsplit

from .models import User

log = logging.getLogger("crm.mail")

LABELS = {
    "task": "task",
    "lead": "lead",
    "deal": "deal",
    "customer": "customer",
}

MAX_RETRIES = 2
SMTP_TIMEOUT = 5


def _valid_email(address: str) -> bool:
    if not address or "\r" in address or "\n" in address:
        return False

    name, parsed = parseaddr(address, strict=True)

    if name or parsed != address.strip():
        return False

    if len(parsed) > 254 or not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+", parsed
    ):
        return False

    return True


def _valid_header(value: str) -> str:
    value = str(value or "")

    if "\r" in value or "\n" in value:
        raise ValueError("Invalid email header")

    return value.strip()


def _smtp_config():
    user = os.getenv("SMTP_USER", "").strip()
    password = (os.getenv("SMTP_PASSWORD") or "").replace(" ", "")

    if not user or not password:
        raise ValueError("SMTP credentials missing")

    if not _valid_email(user):
        raise ValueError("Invalid SMTP username")

    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()

    if not host or any(c.isspace() for c in host):
        raise ValueError("Invalid SMTP host")

    try:
        port = int(os.getenv("SMTP_PORT", "465"))
    except ValueError:
        raise ValueError("Invalid SMTP port")

    if not 1 <= port <= 65535:
        raise ValueError("Invalid SMTP port")

    sender = _valid_header(
        os.getenv("MAIL_FROM") or f"Clientbook <{user}>"
    )

    _, sender_address = parseaddr(sender, strict=True)

    if not _valid_email(sender_address):
        raise ValueError("Invalid sender address")

    return user, password, host, port, sender


def _retryable(error):
    if isinstance(error, smtplib.SMTPAuthenticationError):
        return False

    if isinstance(error, smtplib.SMTPRecipientsRefused):
        return any(
            400 <= response[0] < 500
            for response in error.recipients.values()
        )

    if isinstance(error, smtplib.SMTPResponseException):
        return 400 <= error.smtp_code < 500

    return isinstance(
        error,
        (
            smtplib.SMTPConnectError,
            smtplib.SMTPHeloError,
            smtplib.SMTPServerDisconnected,
            TimeoutError,
            ConnectionError,
        ),
    )


def _send_once(config, msg):
    user, password, host, port, _ = config
    context = ssl.create_default_context()

    if port == 465:
        with smtplib.SMTP_SSL(
            host, port, timeout=SMTP_TIMEOUT, context=context
        ) as smtp:
            smtp.login(user, password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(
            host, port, timeout=SMTP_TIMEOUT
        ) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            smtp.login(user, password)
            smtp.send_message(msg)


def send_email(
    to: str,
    subject: str,
    text: str,
    html_body: str | None = None,
) -> bool:
    """Send email with bounded retries."""

    try:
        config = _smtp_config()

        if not _valid_email(to):
            log.warning("Email rejected: invalid recipient")
            return False

        subject = _valid_header(subject)

        if not subject:
            return False

        msg = EmailMessage()
        msg["From"] = config[4]
        msg["To"] = to.strip()
        msg["Subject"] = subject[:200]

        msg.set_content(str(text or ""))

        if html_body:
            msg.add_alternative(str(html_body), subtype="html")

    except (ValueError, TypeError) as e:
        log.error("Email configuration error: %s", e)
        return False

    for attempt in range(MAX_RETRIES):
        try:
            _send_once(config, msg)
            log.info("Email successfully sent")
            return True

        except Exception as e:
            log.warning(
                "Email failed: attempt=%s error=%s",
                attempt + 1,
                type(e).__name__,
            )

            if not _retryable(e) or attempt == MAX_RETRIES - 1:
                return False

            time.sleep(0.5 * (2 ** attempt) + random.uniform(0, 0.2))

    return False


def _base_url() -> str:
    url = (
        os.getenv("APP_URL")
        or (
            f"https://{os.getenv('VERCEL_PROJECT_PRODUCTION_URL')}"
            if os.getenv("VERCEL_PROJECT_PRODUCTION_URL")
            else ""
        )
    ).strip()

    if not url:
        return ""

    try:
        parsed = urlsplit(url)

        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            return ""

        return url.rstrip("/")

    except ValueError:
        return ""


def _describe(kind: str, obj):
    if kind == "task":
        return obj.title, [
            ("Task", obj.title),
            ("Due", obj.due_date or "No due date"),
            ("Priority", obj.priority),
            ("Customer", obj.customer_name or "None"),
        ], "/tasks"

    if kind == "lead":
        return obj.name, [
            ("Lead", obj.name),
            ("Company", obj.company or "None"),
            ("Follow-up", obj.follow_up_date or "Not set"),
            ("Status", obj.status),
        ], "/leads"

    if kind == "deal":
        return obj.title, [
            ("Deal", obj.title),
            ("Value", f"${obj.value:,.0f}"),
            ("Customer", obj.customer_name or "None"),
            ("Expected close", obj.expected_close or "Not set"),
        ], "/deals"

    if kind == "customer":
        return obj.name, [
            ("Customer", obj.name),
            ("Company", obj.company or "None"),
        ], f"/customers/{quote(str(obj.id), safe='')}"

    raise ValueError("Unsupported notification type")


def _render_email(intro, rows, link=""):
    intro = str(intro)

    text = intro + "\n\n" + "\n".join(
        f"{k}: {v}" for k, v in rows
    )

    if link:
        text += f"\n\nOpen it: {link}"

    text += (
        "\n\nYou can turn these emails off "
        "from the account menu in Clientbook."
    )

    trs = "".join(
        "<tr>"
        f"<td style='padding:4px 12px 4px 0;color:#76736a'>"
        f"{html.escape(str(k))}</td>"
        f"<td>{html.escape(str(v))}</td>"
        "</tr>"
        for k, v in rows
    )

    button = ""

    if link:
        button = (
            f"<p><a href='{html.escape(link, quote=True)}' "
            "style='color:#1f6f5c'>"
            "Open in Clientbook</a></p>"
        )

    body = (
        "<div style='font-family:Arial,sans-serif;"
        "font-size:14px;color:#2a2924'>"
        f"<p>{html.escape(intro)}</p>"
        f"<table>{trs}</table>"
        f"{button}"
        "<p style='color:#76736a;font-size:12px'>"
        "You can turn these emails off from the account "
        "menu in Clientbook.</p></div>"
    )

    return text, body


def notify_assigned(db, kind: str, obj, assignee_id, actor: User) -> None:
    """Email the new assignee."""

    try:
        if not assignee_id or assignee_id == actor.id:
            return

        if kind not in LABELS:
            return

        recipient = db.get(User, assignee_id)

        if (
            not recipient
            or not recipient.is_active
            or not recipient.notify_email
            or recipient.org_id != actor.org_id
        ):
            return

        title, rows, path = _describe(kind, obj)

        base = _base_url()
        link = base + path if base else ""

        intro = f"{actor.name} assigned you a {LABELS[kind]}."
        subject = f"{kind.capitalize()} assigned to you: {title}"[:200]

        text, body = _render_email(intro, rows, link)

        send_email(recipient.email, subject, text, body)

    except Exception as e:
        log.warning(
            "Assignment notification failed: %s",
            type(e).__name__,
        )


def notify_welcome(
    new_user: User,
    setup_url: str,
    admin: User,
) -> None:
    """Send a secure account setup invitation.

    setup_url must be a single-use, expiring invitation link.
    Never send plaintext passwords through email.
    """

    try:
        base = _base_url()

        if not base or not setup_url:
            log.warning("Welcome email skipped: missing setup URL")
            return

        parsed_base = urlsplit(base)
        parsed_setup = urlsplit(setup_url)

        if (
            parsed_setup.scheme != "https"
            or parsed_setup.hostname != parsed_base.hostname
            or parsed_setup.port != parsed_base.port
            or parsed_setup.username
            or parsed_setup.password
        ):
            log.warning("Welcome email skipped: unsafe setup URL")
            return

        org = _valid_header(admin.org_name or "Clientbook")
        intro = f"{admin.name} added you to {org} on Clientbook."

        rows = [
            ("Email", new_user.email),
            ("Organization", org),
        ]

        text, body = _render_email(intro, rows, setup_url)

        text += "\n\nUse the invitation link to set your password."

        body = body.replace(
            "</div>",
            "<p>Use the invitation link to set your password.</p></div>",
        )

        send_email(
            new_user.email,
            f"You were added to {org} on Clientbook",
            text,
            body,
        )

    except Exception as e:
        log.warning(
            "Welcome email failed: %s",
            type(e).__name__,
        )
