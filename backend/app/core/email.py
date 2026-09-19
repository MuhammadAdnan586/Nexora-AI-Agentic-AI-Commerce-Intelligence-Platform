import os
import resend

resend.api_key = os.getenv("RESEND_API_KEY")

# While testing without a verified custom domain, Resend only allows sending
# from their shared "onboarding@resend.dev" address, and only to the email
# address you signed up to Resend with. Once you verify your own domain in
# the Resend dashboard, change FROM_EMAIL to something like
# "Nexora <noreply@yourdomain.com>" and you'll be able to email anyone.
FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "Nexora <onboarding@resend.dev>")


def send_reset_password_email(to_email: str, reset_link: str) -> bool:
    """
    Sends the password reset email via Resend.
    Returns True if the request to Resend succeeded, False otherwise.
    Never raises — a failure here should not break the forgot-password flow
    (we don't want to reveal delivery failures to the caller for security).
    """
    if not resend.api_key:
        print("[email] RESEND_API_KEY not set — skipping email send.")
        return False

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background:#0b0f1a; color:#e6e9f0; border-radius:16px;">
      <h2 style="margin-bottom: 8px;">Reset your Nexora password</h2>
      <p style="color:#9aa3b2; line-height:1.6;">
        We received a request to reset the password for your Nexora account.
        Click the button below to choose a new password. This link expires in 30 minutes.
      </p>
      <div style="margin: 28px 0;">
        <a href="{reset_link}"
           style="background: linear-gradient(90deg,#4fe3f2,#8b6bf0); color:#05070d; text-decoration:none; padding: 12px 28px; border-radius: 10px; font-weight: 600; display:inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color:#6b7280; font-size: 13px; line-height:1.6;">
        If you didn't request this, you can safely ignore this email — your password will not be changed.
      </p>
      <p style="color:#6b7280; font-size: 12px; word-break: break-all;">
        Or paste this link into your browser: {reset_link}
      </p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "Reset your Nexora password",
            "html": html,
        })
        return True
    except Exception as e:
        print(f"[email] Failed to send reset email to {to_email}: {e}")
        return False