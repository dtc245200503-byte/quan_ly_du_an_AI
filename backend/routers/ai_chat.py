from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.schemas import AIChatRequest, AIChatResponse
from backend.auth import get_current_user
from backend.permissions import has_project_access
from backend.services.ai_chat_service import ai_chat_service

router = APIRouter(prefix="/api/ai-chat", tags=["AI Copilot Chat Engine"])


@router.post("/chat", response_model=AIChatResponse)
def chat_with_copilot(req: AIChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
        return AIChatResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý Trợ lý AI Chat: {str(e)}")

