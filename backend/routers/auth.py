import json
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, RevokedToken
from backend.schemas import (
    UserRegister, UserLogin, TokenResponse, UserResponse,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest, VerifyOtpRequest
)
from backend.auth import hash_password, verify_password, create_access_token, get_current_user, oauth2_scheme
from backend.services import auth_challenges as challenges
import secrets
from sqlalchemy.exc import IntegrityError
from jose import jwt
from backend.config import settings
from backend.phone import normalize_phone

router = APIRouter(prefix="/api/auth", tags=["Auth"])

def is_phone_number(val: str) -> bool:
    try:
        normalize_phone(val)
        return True
    except ValueError:
        # Keep exact legacy phone identifiers accepted by the previous login code.
        clean = val.replace("+", "").replace("-", "").replace(" ", "")
        return clean.isdigit()

@router.post("/register")
def register(req: UserRegister, request: Request, db: Session = Depends(get_db)):
    return challenges.issue(db, req.email, "register", request.client.host if request.client else "unknown",
                            {"full_name": req.full_name, "role": req.role or "Member",
                             "phone_number": req.phone_number,
                             "password_hash": hash_password(req.password)})


@router.post("/register/resend")
def resend_register(req: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    # Resend reads the same pending payload under the challenge's SQLite lock.
    return challenges.issue(db, req.identifier, "register", request.client.host if request.client else "unknown", resend=True)


@router.post("/register/verify")
def verify_register(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    challenges.begin(db)
    row = challenges.consume(db, req.identifier, "register", req.token_or_otp)
    if not row.payload or challenges.find_user(db, req.identifier):
        raise HTTPException(400, "Đăng ký không còn hợp lệ. Vui lòng đăng nhập hoặc đăng ký lại.")
    data = json.loads(row.payload)
    if data.get("phone_number") and challenges.find_phone(db, data["phone_number"]):
        raise HTTPException(400, "Số điện thoại này đã được sử dụng")
    db.add(User(email=req.identifier, full_name=data["full_name"], role=data["role"],
                phone_number=data.get("phone_number"),
                password_hash=data["password_hash"], skills="[]"))
    row.payload = row.code_hash = row.grant_hash = None
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "Email hoặc số điện thoại này đã được sử dụng") from None
    return {"message": "Xác minh email và đăng ký thành công. Vui lòng đăng nhập."}


@router.post("/login", response_model=TokenResponse)
def login(req: UserLogin, db: Session = Depends(get_db)):
    identifier = req.identifier.strip()
    is_phone = is_phone_number(identifier)

    if is_phone:
        # Preserve exact legacy identifiers, then match their normalized formatting.
        user = db.query(User).filter(User.phone_number == identifier).first()
        if not user:
            try:
                matches = challenges.phone_matches(db, identifier).limit(2).all()
                user = matches[0] if len(matches) == 1 else None
            except ValueError:
                user = None
    else:
        user = db.query(User).filter(challenges.func.lower(User.email) == identifier.lower()).first()

    if not user:
        raise HTTPException(status_code=401, detail="Email hoặc số điện thoại không tồn tại")

    if user.locked_until and user.locked_until > datetime.datetime.utcnow():
        raise HTTPException(status_code=403, detail="Tài khoản tạm thời bị khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau.")

    if not verify_password(req.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
            db.commit()
            raise HTTPException(status_code=403, detail="Tài khoản đã bị tạm khóa 15 phút do nhập sai quá 5 lần.")
        db.commit()
        raise HTTPException(status_code=401, detail="Mật khẩu không chính xác")

    # Reset failed attempts
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    token = create_access_token({"sub": str(user.id)})

    skills_list = json.loads(user.skills) if user.skills else []
    user_res = UserResponse(
        id=user.id,
        email=user.email,
        phone_number=user.phone_number,
        full_name=user.full_name,
        role=user.role,
        skills=skills_list,
        avatar_url=user.avatar_url,
        gender=user.gender,
        date_of_birth=user.date_of_birth,
        address=user.address,
        bio=user.bio,
        job_title=user.job_title,
        created_at=user.created_at
    )

    return TokenResponse(access_token=token, user=user_res)


@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return {"message": "Đã đăng xuất"}
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        jti = payload.get("jti")
        if jti:
            revoked = RevokedToken(jti=jti)
            db.add(revoked)
            db.commit()
    except Exception:
        pass
    return {"message": "Đăng xuất thành công"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    skills_list = json.loads(current_user.skills) if current_user.skills else []
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        phone_number=current_user.phone_number,
        full_name=current_user.full_name,
        role=current_user.role,
        skills=skills_list,
        avatar_url=current_user.avatar_url,
        gender=current_user.gender,
        date_of_birth=current_user.date_of_birth,
        address=current_user.address,
        bio=current_user.bio,
        job_title=current_user.job_title,
        created_at=current_user.created_at
    )


@router.post("/change-password")
def change_password(req: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không đúng")
    current_user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"message": "Đổi mật khẩu thành công"}


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    return challenges.issue(db, req.identifier, "reset", request.client.host if request.client else "unknown")


@router.post("/reset-password/verify")
def verify_reset(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    challenges.begin(db)
    row = challenges.consume(db, req.identifier, "reset", req.token_or_otp)
    if not challenges.find_user(db, req.identifier):
        raise HTTPException(400, "Mã không đúng, đã hết hạn hoặc đã được sử dụng.")
    token = secrets.token_urlsafe(32)
    row.code_hash = None
    row.grant_hash = challenges.digest(token)
    row.expires_at = challenges.now() + datetime.timedelta(seconds=settings.RESET_TTL_SECONDS)
    db.commit()
    return {"reset_token": token}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if req.new_password != req.confirm_password:
        raise HTTPException(400, "Xác nhận mật khẩu không khớp")
    challenges.begin(db)
    row = challenges.consume(db, req.identifier, "reset", req.token_or_otp, grant=True)
    user = challenges.find_user(db, req.identifier)
    if not user:
        raise HTTPException(400, "Yêu cầu khôi phục không hợp lệ")
    user.password_hash = hash_password(req.new_password)
    row.payload = row.code_hash = row.grant_hash = None
    db.commit()
    return {"message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."}
