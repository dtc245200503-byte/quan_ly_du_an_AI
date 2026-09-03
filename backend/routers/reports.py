import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Project, Task, Sprint, User, ProjectMember
from backend.auth import get_current_user
from backend.permissions import has_project_access
from backend.routers.tasks import format_task_response

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])

@router.get("/dashboard-stats")
def get_dashboard_stats(project_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.datetime.utcnow()

    if project_id:
        if not has_project_access(project_id, current_user, db):
            return {
                "total_projects": 0,
                "total_tasks": 0,
                "completed_tasks": 0,
                "in_progress_tasks": 0,
                "todo_tasks": 0,
                "review_tasks": 0,
                "overdue_tasks": 0,
                "active_sprints": 0,
                "completion_rate": 0.0
            }
        projects_count = 1
        tasks_query = db.query(Task).filter(Task.project_id == project_id)
        sprints_query = db.query(Sprint).filter(Sprint.project_id == project_id, Sprint.status == "Active")
    else:
        if current_user.role == "Admin":
            project_ids = [p.id for p in db.query(Project).all()]
        else:
            member_projects = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).all()
            project_ids = list(set([p[0] for p in member_projects] + [p.id for p in db.query(Project).filter(Project.owner_id == current_user.id).all()]))
        projects_count = len(project_ids)
        tasks_query = db.query(Task).filter(Task.project_id.in_(project_ids)) if project_ids else db.query(Task).filter(False)
        sprints_query = db.query(Sprint).filter(Sprint.project_id.in_(project_ids), Sprint.status == "Active") if project_ids else db.query(Sprint).filter(False)

    all_tasks = tasks_query.all()
    total_tasks = len(all_tasks)
    completed_tasks = len([t for t in all_tasks if t.status == "Done"])
    in_progress_tasks = len([t for t in all_tasks if t.status == "InProgress"])
    todo_tasks = len([t for t in all_tasks if t.status == "Todo"])
    review_tasks = len([t for t in all_tasks if t.status == "Review"])
    overdue_tasks = len([t for t in all_tasks if t.due_date and t.due_date < now and t.status != "Done"])
    active_sprints = sprints_query.count()

    completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    return {
        "total_projects": projects_count,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "todo_tasks": todo_tasks,
        "review_tasks": review_tasks,
        "overdue_tasks": overdue_tasks,
        "active_sprints": active_sprints,
        "completion_rate": completion_rate
    }

@router.get("/workload")
def get_workload_report(project_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if project_id:
        if not has_project_access(project_id, current_user, db):
            return []
        member_records = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
        user_ids = [m.user_id for m in member_records]
    else:
        if current_user.role == "Admin":
            project_ids = [p.id for p in db.query(Project).all()]
        else:
            member_projects = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).all()
            project_ids = list(set([p[0] for p in member_projects] + [p.id for p in db.query(Project).filter(Project.owner_id == current_user.id).all()]))
        member_records = db.query(ProjectMember).filter(ProjectMember.project_id.in_(project_ids)).all() if project_ids else []
        user_ids = list(set([m.user_id for m in member_records] + [current_user.id]))

    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    workload_data = []

    for u in users:
        tasks = db.query(Task).filter(Task.assignee_id == u.id).all()
        if project_id:
            tasks = [t for t in tasks if t.project_id == project_id]

        total_assigned = len(tasks)
        pending_hours = sum(t.estimated_hours or 0.0 for t in tasks if t.status != "Done")
        completed_hours = sum(t.estimated_hours or 0.0 for t in tasks if t.status == "Done")

        workload_data.append({
            "user_id": u.id,
            "full_name": u.full_name,
            "job_title": u.job_title or "Thành viên",
            "avatar_url": u.avatar_url,
            "total_assigned": total_assigned,
            "pending_hours": pending_hours,
            "completed_hours": completed_hours
        })

    return workload_data

@router.get("/overdue-tasks")
def get_overdue_tasks(project_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.datetime.utcnow()
    query = db.query(Task).filter(Task.due_date < now, Task.status != "Done")
    if project_id:
        if not has_project_access(project_id, current_user, db):
            return []
        query = query.filter(Task.project_id == project_id)
    else:
        if current_user.role != "Admin":
            member_projects = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).all()
            project_ids = list(set([p[0] for p in member_projects] + [p.id for p in db.query(Project).filter(Project.owner_id == current_user.id).all()]))
            query = query.filter(Task.project_id.in_(project_ids)) if project_ids else query.filter(False)

    overdue_list = query.all()
    res = []
    for t in overdue_list:
        delay_days = (now - t.due_date).days if t.due_date else 0
        task_data = format_task_response(t).dict()
        task_data["delay_days"] = delay_days
        res.append(task_data)

    return res

