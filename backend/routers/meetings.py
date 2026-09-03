import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Meeting, User, Project, ProjectMember
from backend.schemas import MeetingCreate, MeetingUpdate, MeetingResponse, UserResponse
from backend.auth import get_current_user
from backend.permissions import verify_project_access, has_project_access
from backend.routers.users import to_user_response

router = APIRouter(prefix="/api/meetings", tags=["Meetings"])

def build_meeting_response(m: Meeting, db: Session) -> MeetingResponse:
    try:
        participant_ids = json.loads(m.participants) if m.participants else []
    except Exception:
        participant_ids = []

    users = db.query(User).filter(User.id.in_(participant_ids)).all() if participant_ids else []
    creator = db.query(User).filter(User.id == m.created_by).first()

    creator_resp = to_user_response(creator) if creator else None
    users_resp = [to_user_response(u) for u in users]

    return MeetingResponse(
        id=m.id,
        project_id=m.project_id,
        title=m.title,
        platform=m.platform,
        meeting_link=m.meeting_link,
        start_time=m.start_time,
        created_by=m.created_by,
        creator=creator_resp,
        participants=participant_ids,
        participant_users=users_resp,
        created_at=m.created_at
    )

@router.get("/", response_model=List[MeetingResponse])
def get_meetings(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not has_project_access(project_id, current_user, db):
        return []

    meetings = db.query(Meeting).filter(Meeting.project_id == project_id).order_by(Meeting.start_time.asc()).all()
    return [build_meeting_response(m, db) for m in meetings]

@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(req: MeetingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_project_access(req.project_id, current_user, db)

    participants_str = json.dumps(req.participants or [], ensure_ascii=False)

    meeting = Meeting(
        project_id=req.project_id,
        title=req.title,
        platform=req.platform or "Google Meet",
        meeting_link=req.meeting_link,
        start_time=req.start_time,
        created_by=current_user.id,
        participants=participants_str
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    return build_meeting_response(meeting, db)

@router.put("/{meeting_id}", response_model=MeetingResponse)
def update_meeting(meeting_id: int, req: MeetingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc họp")

    verify_project_access(meeting.project_id, current_user, db)

    if req.title is not None:
        meeting.title = req.title
    if req.platform is not None:
        meeting.platform = req.platform
    if req.meeting_link is not None:
        meeting.meeting_link = req.meeting_link
    if req.start_time is not None:
        meeting.start_time = req.start_time
    if req.participants is not None:
        meeting.participants = json.dumps(req.participants, ensure_ascii=False)

    db.commit()
    db.refresh(meeting)

    return build_meeting_response(meeting, db)

@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc họp")

    verify_project_access(meeting.project_id, current_user, db)

    db.delete(meeting)
    db.commit()
    return {"message": "Đã xóa cuộc họp thành công"}


    db.delete(meeting)
    db.commit()
    return {"message": "Đã xóa cuộc họp thành công"}
