from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Sprint, Task, User
from backend.schemas import SprintCreate, SprintUpdate, SprintResponse
from backend.auth import get_current_user
from backend.permissions import verify_project_access, has_project_access

router = APIRouter(prefix="/api/sprints", tags=["Sprints"])

def format_sprint_response(db: Session, s: Sprint) -> SprintResponse:
    task_count = db.query(Task).filter(Task.sprint_id == s.id).count()
    return SprintResponse(
        id=s.id,
        project_id=s.project_id,
        name=s.name,
        goal=s.goal,
        status=s.status,
        start_date=s.start_date,
        end_date=s.end_date,
        task_count=task_count
    )

@router.get("/", response_model=List[SprintResponse])
def get_sprints(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not has_project_access(project_id, current_user, db):
        return []
    sprints = db.query(Sprint).filter(Sprint.project_id == project_id).all()
    return [format_sprint_response(db, s) for s in sprints]

@router.post("/", response_model=SprintResponse)
def create_sprint(req: SprintCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_project_access(req.project_id, current_user, db)
    sprint = Sprint(
        project_id=req.project_id,
        name=req.name,
        goal=req.goal,
        status="Planning",
        start_date=req.start_date,
        end_date=req.end_date
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return format_sprint_response(db, sprint)

@router.get("/{sprint_id}", response_model=SprintResponse)
def get_sprint(sprint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Không tìm thấy Sprint")
    verify_project_access(sprint.project_id, current_user, db)
    return format_sprint_response(db, sprint)

@router.put("/{sprint_id}", response_model=SprintResponse)
def update_sprint(sprint_id: int, req: SprintUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Không tìm thấy Sprint")
    
    verify_project_access(sprint.project_id, current_user, db)

    if req.name is not None:
        sprint.name = req.name
    if req.goal is not None:
        sprint.goal = req.goal
    if req.status is not None:
        sprint.status = req.status
    if req.start_date is not None:
        sprint.start_date = req.start_date
    if req.end_date is not None:
        sprint.end_date = req.end_date

    db.commit()
    db.refresh(sprint)
    return format_sprint_response(db, sprint)

@router.delete("/{sprint_id}")
def delete_sprint(sprint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Không tìm thấy Sprint")
    verify_project_access(sprint.project_id, current_user, db)
    db.delete(sprint)
    db.commit()
    return {"message": "Đã xóa Sprint thành công"}

