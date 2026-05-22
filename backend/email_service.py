import os
import resend

resend.api_key = os.getenv("RESEND_API_KEY")


def send_verification_email(to_email: str, verify_url: str):
    response = resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": to_email,
        "subject": "Verify your account",
        "html": f"""
        <h2>Verify your account</h2>
        <p>Click the link below:</p>
        <a href="{verify_url}">{verify_url}</a>
        """
    })

    print("RESEND RESPONSE:", response)