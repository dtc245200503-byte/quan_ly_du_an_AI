import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models import Task, TaskComment, TaskAttachment, User
from backend.schemas import CommentCreate, CommentResponse, AttachmentResponse
from backend.auth import get_current_user
from backend.routers.users import to_user_response

router = APIRouter(prefix="/api/tasks", tags=["Comments & Attachments"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.post("/{task_id}/comments", response_model=CommentResponse)
def create_comment(task_id: int, req: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")

    comment = TaskComment(
        task_id=task_id,
        user_id=current_user.id,
        content=req.content
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        task_id=comment.task_id,
        user_id=comment.user_id,
        user=to_user_response(current_user),
        content=comment.content,
        created_at=comment.created_at
    )

@router.get("/{task_id}/comments", response_model=List[CommentResponse])
def get_comments(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")

    comments = db.query(TaskComment).filter(TaskComment.task_id == task_id).all()
    return [
        CommentResponse(
            id=c.id,
            task_id=c.task_id,
            user_id=c.user_id,
            user=to_user_response(c.user),
            content=c.content,
            created_at=c.created_at
        ) for c in comments
    ]

@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comment = db.query(TaskComment).filter(TaskComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bình luận")
    if comment.user_id != current_user.id and current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa bình luận này")
    db.delete(comment)
    db.commit()
    return {"message": "Đã xóa bình luận thành công"}

@router.post("/{task_id}/attachments", response_model=AttachmentResponse)
async def upload_attachment(
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")

    filename = file.filename
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    content = await file.read()
    file_size = len(content)
    with open(file_path, "wb") as f:
        f.write(content)

    attachment = TaskAttachment(
        task_id=task_id,
        user_id=current_user.id,
        file_name=filename,
        file_path=file_path,
        file_size=file_size
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return AttachmentResponse(
        id=attachment.id,
        task_id=attachment.task_id,
        user_id=attachment.user_id,
        file_name=attachment.file_name,
        file_path=attachment.file_path,
        file_size=attachment.file_size,
        uploaded_at=attachment.uploaded_at
    )

@router.get("/attachments/{attachment_id}/download")
def download_attachment(attachment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    attachment = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id).first()
    if not attachment or not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp tài liệu đính kèm")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.file_name,
        media_type="application/octet-stream"
    )

@router.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    attachment = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp tài liệu đính kèm")
    
    if os.path.exists(attachment.file_path):
        try:
            os.remove(attachment.file_path)
        except Exception:
            pass

    db.delete(attachment)
    db.commit()
    return {"message": "Đã xóa tệp đính kèm thành công"}
