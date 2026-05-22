import os
import smtplib
import ssl
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# SMTP Configuration (loaded from environment)
# ──────────────────────────────────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "") or SMTP_USERNAME
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "StudentCoursera")


def _is_smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USERNAME and SMTP_PASSWORD)


def _build_html_email(title: str, body_html: str, cta_label: str = "", cta_url: str = "") -> str:
    """Returns a production-ready, responsive HTML email body."""
    cta_block = ""
    if cta_label and cta_url:
        cta_block = f"""
        <tr>
          <td align="center" style="padding: 24px 0 8px;">
            <a href="{cta_url}"
               style="display:inline-block;padding:14px 32px;background:#6366f1;
                      color:#ffffff;text-decoration:none;border-radius:8px;
                      font-size:15px;font-weight:600;letter-spacing:0.3px;">
              {cta_label}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0 0; color:#94a3b8; font-size:13px; text-align:center;">
            Or copy this link into your browser:<br>
            <a href="{cta_url}" style="color:#6366f1;word-break:break-all;">{cta_url}</a>
          </td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title}</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#1e293b;border-radius:16px;overflow:hidden;
                    border:1px solid #334155;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);
                     padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                       letter-spacing:-0.5px;">StudentCoursera</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#f1f5f9;font-size:20px;font-weight:700;
                           padding-bottom:16px;">{title}</td>
              </tr>
              <tr>
                <td style="color:#cbd5e1;font-size:15px;line-height:1.7;">
                  {body_html}
                </td>
              </tr>
              {cta_block}
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#475569;font-size:12px;">
              This email was sent by StudentCoursera. If you did not request this, ignore it.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_smtp_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Core SMTP send function.
    - Port 465 → SSL (SMTP_SSL)
    - Port 587 (default) → STARTTLS
    - Timeout: 15s
    Returns True on success, False on failure.
    """
    if not _is_smtp_configured():
        logger.warning(
            "[SMTP NOT CONFIGURED] To=%s | Subject=%s", to_email, subject
        )
        logger.warning("Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD in your .env file.")
        return False

    from_addr = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if SMTP_PORT == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=15) as server:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())

        logger.info("[SMTP] Email sent to %s | Subject: %s", to_email, subject)
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error("[SMTP] Authentication failed. Check SMTP_USERNAME / SMTP_PASSWORD.")
        return False
    except smtplib.SMTPConnectError:
        logger.error("[SMTP] Could not connect to %s:%s", SMTP_HOST, SMTP_PORT)
        return False
    except smtplib.SMTPException as e:
        logger.error("[SMTP] SMTPException: %s", str(e))
        return False
    except Exception as e:
        logger.error("[SMTP] Unexpected error: %s", str(e))
        return False


# ──────────────────────────────────────────────
# Public helpers used by routers / worker
# ──────────────────────────────────────────────

def send_verification_email(to_email: str, verify_url: str) -> bool:
    html = _build_html_email(
        title="Verify your email address",
        body_html=(
            "Thank you for registering on <strong>StudentCoursera</strong>.<br><br>"
            "Please verify your email address by clicking the button below. "
            "This link expires in <strong>24 hours</strong>."
        ),
        cta_label="Verify Email Address",
        cta_url=verify_url,
    )
    return send_smtp_email(to_email, "Verify your StudentCoursera account", html)


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    html = _build_html_email(
        title="Reset your password",
        body_html=(
            "We received a request to reset the password for your "
            "<strong>StudentCoursera</strong> account.<br><br>"
            "Click the button below to set a new password. "
            "This link expires in <strong>1 hour</strong> and can only be used once."
        ),
        cta_label="Reset Password",
        cta_url=reset_url,
    )
    return send_smtp_email(to_email, "Reset your StudentCoursera password", html)


def send_generic_email(to_email: str, subject: str, body: str) -> bool:
    """
    Used by the background worker to send queued email jobs.
    Detects a URL in the body and turns it into a CTA button automatically.
    """
    cta_url = ""
    cta_label = ""
    for word in body.split():
        if word.startswith("http://") or word.startswith("https://"):
            cta_url = word
            # Guess label from subject
            if "reset" in subject.lower():
                cta_label = "Reset Password"
            elif "verif" in subject.lower():
                cta_label = "Verify Email Address"
            else:
                cta_label = "Open Link"
            break

    safe_body = body.replace(cta_url, "").strip()
    html = _build_html_email(
        title=subject,
        body_html=safe_body.replace("\n", "<br>"),
        cta_label=cta_label,
        cta_url=cta_url,
    )
    return send_smtp_email(to_email, subject, html)