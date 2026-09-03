import json
import os
import uuid
import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models import User, ProjectMember
from backend.schemas import UserResponse, UserProfileUpdate, UserRoleUpdate, QuickUserCreate
from backend.auth import get_current_user, get_current_admin, hash_password

router = APIRouter(prefix="/api/users", tags=["Users"])

def to_user_response(user: User) -> UserResponse:
    skills_list = json.loads(user.skills) if user.skills else []
    return UserResponse(
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

@router.get("/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = db.query(User).all()
    return [to_user_response(u) for u in users]

@router.post("/quick-add", response_model=UserResponse)
def quick_add_user(req: QuickUserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    clean_name = req.full_name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Tên người dùng không được để trống")

    # Check if user with same name exists
    existing = db.query(User).filter(User.full_name == clean_name).first()
    if existing:
        return to_user_response(existing)

    # Generate email slug
    slug = re.sub(r'[^a-zA-Z0-9]', '', clean_name.lower()) or "user"
    unique_email = f"{slug}_{uuid.uuid4().hex[:4]}@g9.vn"

    new_user = User(
        email=unique_email,
        password_hash=hash_password("g9member123"),
        full_name=clean_name,
        role="Member",
        job_title="Thành viên mới",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if req.project_id:
        pm = ProjectMember(project_id=req.project_id, user_id=new_user.id, role="Member")
        db.add(pm)
        db.commit()

    return to_user_response(new_user)

@router.post("/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ext = os.path.splitext(file.filename)[1].lower() or ".png"
    unique_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:6]}{ext}"
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    avatar_url = f"/uploads/{unique_filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)

    return {"avatar_url": avatar_url, "user": to_user_response(current_user)}

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return to_user_response(user)

@router.put("/{user_id}", response_model=UserResponse)
def update_user_profile(
    user_id: int,
    req: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id != user_id and current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền sửa thông tin cá nhân của người khác")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if req.full_name is not None:
        user.full_name = req.full_name
    if req.phone_number is not None:
        user.phone_number = req.phone_number
    if req.email is not None:
        user.email = req.email
    if req.skills is not None:
        user.skills = json.dumps(req.skills, ensure_ascii=False)
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url
    if req.gender is not None:
        user.gender = req.gender
    if req.date_of_birth is not None:
        user.date_of_birth = req.date_of_birth
    if req.address is not None:
        user.address = req.address
    if req.bio is not None:
        user.bio = req.bio
    if req.job_title is not None:
        user.job_title = req.job_title

    db.commit()
    db.refresh(user)
    return to_user_response(user)

@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    req: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    user.role = req.role
    db.commit()
    db.refresh(user)
    return to_user_response(user)

