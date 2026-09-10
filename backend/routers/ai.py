from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
from backend.schemas import (
    WeeklySummaryRequest, WeeklySummaryResponse,
    MeetingMinutesRequest, MeetingMinutesResponse,
    SuggestAssignmentRequest, SuggestAssignmentResponse,
    AIReportResponse, RiskAnalysisResponse,
    AIFeedbackCreate, AIFeedbackResponse
)
from backend.auth import get_current_user
from backend.permissions import has_project_access
from backend.services.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Services"])


class RiskAnalysisRequest(BaseModel):
    project_id: int


@router.post("/weekly-summary", response_model=WeeklySummaryResponse)
def weekly_summary(
    req: WeeklySummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not has_project_access(req.project_id, current_user, db):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập dự án này")
    try:
        res = ai_service.generate_weekly_summary(db, req.project_id)
        return WeeklySummaryResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo tóm tắt tiến độ: {str(e)}")


@router.get("/reports", response_model=List[AIReportResponse])
def get_ai_reports(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Phase 3: Xem lại lịch sử các báo cáo AI đã tạo"""
    if not has_project_access(project_id, current_user, db):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập dự án này")
    try:
        reports = ai_service.get_ai_reports(db, project_id)
        return reports
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy lịch sử báo cáo: {str(e)}")


@router.post("/meeting-minutes", response_model=MeetingMinutesResponse)
def meeting_minutes(
    req: MeetingMinutesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not has_project_access(req.project_id, current_user, db):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập dự án này")
    try:
        res = ai_service.generate_meeting_minutes(db, req.project_id, current_user.id, req.title, req.raw_notes)
        return MeetingMinutesResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo biên bản họp: {str(e)}")


@router.post("/suggest-assignment", response_model=SuggestAssignmentResponse)
def suggest_assignment(
    req: SuggestAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not has_project_access(req.project_id, current_user, db):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập dự án này")
    try:
        res = ai_service.suggest_assignment(db, req.project_id, req.task_title, req.required_skills)
        return SuggestAssignmentResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi gợi ý phân công: {str(e)}")


@router.post("/analyze-risk", response_model=RiskAnalysisResponse)
def analyze_risk(
    req: RiskAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Phase 4: Phân tích tiến độ & gán điểm ai_risk_score cho các nhiệm vụ trong dự án"""
    if not has_project_access(req.project_id, current_user, db):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập dự án này")
    try:
        res = ai_service.calculate_risk_scores(db, req.project_id)
        return RiskAnalysisResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi phân tích rủi ro: {str(e)}")


@router.post("/feedback", response_model=AIFeedbackResponse)
def submit_feedback(
    req: AIFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Phase 5: Tiếp nhận phản hồi đánh giá chất lượng AI 👍/👎"""
    try:
        res = ai_service.save_feedback(
            db=db,
            user_id=current_user.id,
            feature=req.feature,
            rating=req.rating,
            note=req.note
        )
        return AIFeedbackResponse.model_validate(res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi gửi phản hồi: {str(e)}")
