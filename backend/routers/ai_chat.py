from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, ChatMessage
from backend.schemas import AIChatRequest, AIChatResponse, ChatMessageResponse
from backend.auth import get_current_user
from backend.permissions import has_project_access
from backend.services.ai_chat_service import ai_chat_service

router = APIRouter(prefix="/api/ai-chat", tags=["AI Copilot Chat Engine"])


@router.post("/chat", response_model=AIChatResponse)
def chat_with_copilot(
    req: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        project_id = req.project_id
        if project_id and not has_project_access(project_id, current_user, db):
            project_id = None

        history_list = [{"role": msg.role, "content": msg.content} for msg in (req.history or [])]
        res = ai_chat_service.generate_chat_response(
            db=db,
            project_id=project_id,
            message=req.message,
            history=history_list
        )

        # Lưu cả 2 message (user + assistant) vào bảng ChatMessage (Phase 2)
        user_msg = ChatMessage(
            project_id=project_id,
            user_id=current_user.id,
            role="user",
            content=req.message
        )
        assistant_msg = ChatMessage(
            project_id=project_id,
            user_id=current_user.id,
            role="assistant",
            content=res["reply"]
        )
        db.add(user_msg)
        db.add(assistant_msg)
        db.commit()

        return AIChatResponse(**res)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý Trợ lý AI Chat: {str(e)}")


@router.get("/history", response_model=List[ChatMessageResponse])
def get_chat_history(
    project_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lấy lịch sử chat gần nhất - áp dụng sliding window query (limit N) và kiểm tra quyền truy cập (Phase 2 & R3).
    """
    try:
        query = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)
        if project_id:
            if not has_project_access(project_id, current_user, db):
                raise HTTPException(status_code=403, detail="Không có quyền truy cập dự án này")
            query = query.filter(ChatMessage.project_id == project_id)

        # Sliding window query: chỉ lấy tối đa 50 tin nhắn mới nhất
        messages = query.order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc()).limit(min(limit, 100)).all()
        messages.reverse()
        return messages

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy lịch sử chat: {str(e)}")
