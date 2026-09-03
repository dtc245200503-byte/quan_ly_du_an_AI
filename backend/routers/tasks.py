import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Task, User, TaskComment, TaskAttachment
from backend.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, CommentResponse, AttachmentResponse
)
from backend.auth import get_current_user
from backend.routers.users import to_user_response
from backend.permissions import verify_project_access, has_project_access

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

def format_task_response(t: Task) -> TaskResponse:
    assignee_res = to_user_response(t.assignee) if t.assignee else None
    reporter_res = to_user_response(t.reporter) if t.reporter else None

    comments_res = [
        CommentResponse(
            id=c.id,
            task_id=c.task_id,
            user_id=c.user_id,
            user=to_user_response(c.user),
            content=c.content,
            created_at=c.created_at
        ) for c in t.comments
    ] if t.comments else []

    attachments_res = [
        AttachmentResponse(
            id=a.id,
            task_id=a.task_id,
            user_id=a.user_id,
            file_name=a.file_name,
            file_path=a.file_path,
            file_size=a.file_size,
            uploaded_at=a.uploaded_at
        ) for a in t.attachments
    ] if t.attachments else []

    return TaskResponse(
        id=t.id,
        project_id=t.project_id,
        sprint_id=t.sprint_id,
        title=t.title,
        description=t.description,
        status=t.status,
        priority=t.priority,
        assignee_id=t.assignee_id,
        assignee=assignee_res,
        reporter_id=t.reporter_id,
        reporter=reporter_res,
        due_date=t.due_date,
        estimated_hours=t.estimated_hours or 0.0,
        comments=comments_res,
        attachments=attachments_res,
        created_at=t.created_at,
        updated_at=t.updated_at
    )

@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    project_id: int,
    sprint_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    assignee_id: Optional[int] = None,
    is_overdue: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not has_project_access(project_id, current_user, db):
        return []

    query = db.query(Task).filter(Task.project_id == project_id)

    if sprint_id is not None:
        query = query.filter(Task.sprint_id == sprint_id)

    if status_filter:
        query = query.filter(Task.status == status_filter)

    if priority_filter:
        query = query.filter(Task.priority == priority_filter)

    if assignee_id is not None:
        query = query.filter(Task.assignee_id == assignee_id)

    if is_overdue:
        now = datetime.datetime.utcnow()
        query = query.filter(Task.due_date < now, Task.status != "Done")

    if search:
        pattern = f"%{search}%"
        query = query.filter(Task.title.ilike(pattern) | Task.description.ilike(pattern))

    tasks = query.all()
    return [format_task_response(t) for t in tasks]

@router.post("/", response_model=TaskResponse)
def create_task(req: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_project_access(req.project_id, current_user, db)
    task = Task(
        project_id=req.project_id,
        sprint_id=req.sprint_id,
        title=req.title,
        description=req.description,
        status=req.status or "Todo",
        priority=req.priority or "Medium",
        assignee_id=req.assignee_id,
        reporter_id=current_user.id,
        due_date=req.due_date,
        estimated_hours=req.estimated_hours or 0.0
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return format_task_response(task)

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")
    verify_project_access(task.project_id, current_user, db)
    return format_task_response(task)

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, req: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")

    verify_project_access(task.project_id, current_user, db)

    if req.title is not None:
        task.title = req.title
    if req.description is not None:
        task.description = req.description
    if req.status is not None:
        task.status = req.status
    if req.priority is not None:
        task.priority = req.priority
    if req.assignee_id is not None:
        task.assignee_id = req.assignee_id
    if req.sprint_id is not None:
        task.sprint_id = req.sprint_id
    if req.due_date is not None:
        task.due_date = req.due_date
    if req.estimated_hours is not None:
        task.estimated_hours = req.estimated_hours

    db.commit()
    db.refresh(task)
    return format_task_response(task)

@router.patch("/{task_id}", response_model=TaskResponse)
def patch_task(task_id: int, req: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return update_task(task_id, req, db, current_user)

@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")

    verify_project_access(task.project_id, current_user, db)

    db.delete(task)
    db.commit()
    return {"message": "Đã xóa nhiệm vụ thành công"}

