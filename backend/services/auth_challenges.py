import datetime as dt
import hashlib
import hmac
import json
import secrets
from fastapi import HTTPException
from sqlalchemy import func, text
from backend.models import AuthChallenge, User
from backend.config import settings
from backend.services.auth_email import check_smtp, send_otp
from backend.phone import normalize_phone


def now():
    return dt.datetime.utcnow()


def digest(value):
    return hmac.new(settings.SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()


def find_user(db, email):
    return db.query(User).filter(func.lower(User.email) == email).first()


def phone_matches(db, phone):
    # Support existing formatted values without rewriting any stored phone number.
    stored = User.phone_number
    for char in (" ", "-", "(", ")", "\t", "\r", "\n"):
        stored = func.replace(stored, char, "")
    return db.query(User).filter(stored == normalize_phone(phone))


def find_phone(db, phone):
    return phone_matches(db, phone).first()


def begin(db):
    # Serialize challenge consumption, resend and counters across SQLite workers.
    db.execute(text("BEGIN IMMEDIATE"))


def issue(db, email, purpose, ip, payload=None, resend=False):
    check_smtp()  # Same failure for known and unknown recovery addresses.
    begin(db)
    stamp = now()
    db.query(AuthChallenge).filter(AuthChallenge.expires_at < stamp).update(
        {"payload": None, "code_hash": None, "grant_hash": None})
    cutoff = stamp - dt.timedelta(seconds=settings.OTP_WINDOW_SECONDS)
    db.query(AuthChallenge).filter(AuthChallenge.window_start < cutoff,
                                   AuthChallenge.expires_at < stamp).delete()
    key = f"{purpose}:{email}"
    row = db.get(AuthChallenge, key)
    if resend:
        if not row or not row.payload or row.expires_at <= stamp:
            raise HTTPException(400, "Đăng ký tạm đã hết hạn. Vui lòng nhập lại thông tin đăng ký.")
        payload = json.loads(row.payload)
    ip_key = "ip:" + digest(ip)
    bucket = db.get(AuthChallenge, ip_key)
    if bucket and bucket.window_start < cutoff:
        db.delete(bucket)
        db.flush()
        bucket = None
    if bucket and bucket.sends >= settings.OTP_IP_MAX_SENDS:
        raise HTTPException(429, "Đã vượt giới hạn gửi mã. Vui lòng thử lại sau.")
    if row:
        wait = settings.OTP_RESEND_SECONDS - int((stamp - row.last_sent).total_seconds())
        if wait > 0:
            raise HTTPException(429, f"Vui lòng chờ {wait} giây trước khi gửi lại.", headers={"Retry-After": str(wait)})
        if row.sends >= settings.OTP_MAX_SENDS or row.attempts >= settings.OTP_MAX_ATTEMPTS:
            raise HTTPException(429, "Đã vượt giới hạn xác minh. Vui lòng thử lại sau một giờ.")
    if purpose == "register" and find_user(db, email):
        raise HTTPException(400, "Email này đã được sử dụng")
    if purpose == "register" and payload and payload.get("phone_number") and find_phone(db, payload["phone_number"]):
        raise HTTPException(400, "Số điện thoại này đã được sử dụng")
    if not row:
        row = AuthChallenge(key=key, email=email, purpose=purpose, window_start=stamp, sends=0, attempts=0)
        db.add(row)
    if not bucket:
        bucket = AuthChallenge(key=ip_key, email="", purpose="rate", window_start=stamp, sends=0, attempts=0)
        db.add(bucket)
    code = f"{secrets.randbelow(1000000):06d}"
    row.code_hash = digest(key + ":" + code)
    row.grant_hash = None
    row.payload = json.dumps(payload) if payload else None
    row.expires_at = stamp + dt.timedelta(seconds=settings.OTP_TTL_SECONDS)
    row.last_sent = bucket.last_sent = stamp
    bucket.expires_at = stamp + dt.timedelta(seconds=settings.OTP_WINDOW_SECONDS)
    row.sends += 1
    bucket.sends += 1
    # Same delivery behavior for every reset address prevents account enumeration
    # via SMTP errors or request duration. Unknown addresses cannot obtain a grant.
    try:
        send_otp(email, code, purpose)
    except HTTPException:
        db.rollback()
        raise
    db.commit()
    result = {"message": "Mã xác minh đã được gửi đến email." if purpose == "register" else
            "Nếu email đã đăng ký, bạn sẽ nhận được mã khôi phục. Vui lòng kiểm tra cả thư rác.",
            "resend_after": settings.OTP_RESEND_SECONDS, "expires_in": settings.OTP_TTL_SECONDS}
    if purpose == "register":
        result["registration_email"] = email
    return result


def consume(db, email, purpose, value, grant=False):
    row = db.get(AuthChallenge, f"{purpose}:{email}")
    expected = row.grant_hash if row and grant else row.code_hash if row else None
    actual = digest(value if grant else f"{purpose}:{email}:{value}")
    if (not row or row.expires_at <= now() or row.attempts >= settings.OTP_MAX_ATTEMPTS
            or not expected or not hmac.compare_digest(expected, actual)):
        if row:
            row.attempts += 1
            if row.attempts >= settings.OTP_MAX_ATTEMPTS or row.expires_at <= now():
                row.payload = row.code_hash = row.grant_hash = None
            db.commit()
        raise HTTPException(400, "Mã không đúng, đã hết hạn hoặc đã được sử dụng.")
    return row
