"""Real SMTP delivery. Never log message bodies, credentials, or OTPs."""
import smtplib
import ssl
from email.message import EmailMessage
from fastapi import HTTPException
from backend.config import settings


def check_smtp():
    if (not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL
            or (settings.SMTP_USERNAME and not settings.SMTP_PASSWORD)
            or (not settings.SMTP_USE_TLS and not settings.SMTP_USE_SSL)):
        raise HTTPException(503, "Dịch vụ email chưa được cấu hình đầy đủ. Vui lòng liên hệ quản trị viên.")


def send_otp(email: str, code: str, purpose: str):
    check_smtp()
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = email
    message["Subject"] = "G9 - Mã xác minh email" if purpose == "register" else "G9 - Khôi phục mật khẩu"
    message.set_content(f"Mã xác minh G9: {code}\nCó hiệu lực {settings.OTP_TTL_SECONDS // 60} phút, chỉ dùng một lần. Không chia sẻ mã này.\nNếu bạn không yêu cầu, hãy bỏ qua email. Mã khôi phục chỉ có tác dụng với tài khoản đã đăng ký.")
    try:
        transport = smtplib.SMTP_SSL if settings.SMTP_USE_SSL else smtplib.SMTP
        kwargs = {"timeout": 15}
        if settings.SMTP_USE_SSL:
            kwargs["context"] = ssl.create_default_context()
        with transport(settings.SMTP_HOST, settings.SMTP_PORT, **kwargs) as smtp:
            if settings.SMTP_USE_TLS and not settings.SMTP_USE_SSL:
                smtp.starttls(context=ssl.create_default_context())
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            if smtp.send_message(message):
                raise RuntimeError("Recipient refused")
    except Exception:
        raise HTTPException(503, "Không thể gửi email lúc này. Vui lòng thử lại sau.") from None
