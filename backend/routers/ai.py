from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
from backend.schemas import (
    WeeklySummaryRequest, WeeklySummaryResponse,
    MeetingMinutesRequest, MeetingMinutesResponse,
    SuggestAssignmentRequest, SuggestAssignmentResponse
)
from backend.auth import get_current_user
from backend.services.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Services"])

@router.post("/weekly-summary", response_model=WeeklySummaryResponse)
def weekly_summary(req: WeeklySummaryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        res = ai_service.generate_weekly_summary(db, req.project_id)
        return WeeklySummaryResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo tóm tắt tiến độ: {str(e)}")

@router.post("/meeting-minutes", response_model=MeetingMinutesResponse)
def meeting_minutes(req: MeetingMinutesRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        res = ai_service.generate_meeting_minutes(db, req.project_id, current_user.id, req.title, req.raw_notes)
        return MeetingMinutesResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo biên bản họp: {str(e)}")

@router.post("/suggest-assignment", response_model=SuggestAssignmentResponse)
def suggest_assignment(req: SuggestAssignmentRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        res = ai_service.suggest_assignment(db, req.project_id, req.task_title, req.required_skills)
        return SuggestAssignmentResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi gợi ý phân công: {str(e)}")
