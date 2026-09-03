import json
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, RevokedToken
from backend.schemas import (
    UserRegister, UserLogin, TokenResponse, UserResponse,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
)
from backend.auth import hash_password, verify_password, create_access_token, get_current_user, oauth2_scheme
from backend.services.notification_service import notification_adapter
from jose import jwt
from backend.config import settings

router = APIRouter(prefix="/api/auth", tags=["Auth"])

def is_phone_number(val: str) -> bool:
    clean = val.replace("+", "").replace("-", "").replace(" ", "")
    return clean.isdigit()

@router.post("/register", response_model=TokenResponse)
def register(req: UserRegister, db: Session = Depends(get_db)):
    identifier = req.identifier.strip()
    is_phone = is_phone_number(identifier)

    # Check existing user
    if is_phone:
        existing = db.query(User).filter(User.phone_number == identifier).first()
        if existing:
            raise HTTPException(status_code=400, detail="Số điện thoại này đã được sử dụng")
        email_val = None
        phone_val = identifier
    else:
        existing = db.query(User).filter(User.email == identifier).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email này đã được sử dụng")
        email_val = identifier
        phone_val = None

    new_user = User(
        email=email_val,
        phone_number=phone_val,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        role=req.role or "Member",
        skills=json.dumps(["Python", "React", "Project Management"], ensure_ascii=False)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id)})
    
    # Format skills for response
    skills_list = json.loads(new_user.skills) if new_user.skills else []
    user_res = UserResponse(
        id=new_user.id,
        email=new_user.email,
        phone_number=new_user.phone_number,
        full_name=new_user.full_name,
        role=new_user.role,
        skills=skills_list,
        avatar_url=new_user.avatar_url,
        gender=new_user.gender,
        date_of_birth=new_user.date_of_birth,
        address=new_user.address,
        bio=new_user.bio,
        job_title=new_user.job_title,
        created_at=new_user.created_at
    )

    return TokenResponse(access_token=token, user=user_res)


@router.post("/login", response_model=TokenResponse)
def login(req: UserLogin, db: Session = Depends(get_db)):
    identifier = req.identifier.strip()
    is_phone = is_phone_number(identifier)

    if is_phone:
        user = db.query(User).filter(User.phone_number == identifier).first()
    else:
        user = db.query(User).filter(User.email == identifier).first()

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
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    identifier = req.identifier.strip()
    is_phone = is_phone_number(identifier)

    if is_phone:
        user = db.query(User).filter(User.phone_number == identifier).first()
    else:
        user = db.query(User).filter(User.email == identifier).first()

    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản với thông tin đã cung cấp")

    # Generate sample 6-digit OTP code
    otp = "889966"
    notification_adapter.send_password_reset_notification(identifier, is_phone, otp)

    return {
        "message": f"Mã OTP khôi phục mật khẩu đã được gửi đến {identifier}",
        "demo_otp": otp # Provided for demo/testing convenience
    }


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    identifier = req.identifier.strip()
    is_phone = is_phone_number(identifier)

    if is_phone:
        user = db.query(User).filter(User.phone_number == identifier).first()
    else:
        user = db.query(User).filter(User.email == identifier).first()

    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")

    if req.token_or_otp != "889966" and len(req.token_or_otp) < 4:
        raise HTTPException(status_code=400, detail="Mã OTP khôi phục không hợp lệ")

    user.password_hash = hash_password(req.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    return {"message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."}
