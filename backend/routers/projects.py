from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Project, ProjectMember, User
from backend.schemas import ProjectCreate, ProjectUpdate, ProjectResponse, MemberAdd, MemberResponse
from backend.auth import get_current_user
from backend.routers.users import to_user_response
from backend.permissions import verify_project_access

router = APIRouter(prefix="/api/projects", tags=["Projects"])

def format_project_response(p: Project) -> ProjectResponse:
    owner_res = to_user_response(p.owner)
    members_res = []
    for m in p.members:
        if m.user:
            members_res.append(MemberResponse(
                id=m.id,
                project_id=m.project_id,
                user_id=m.user_id,
                role=m.role,
                user=to_user_response(m.user),
                joined_at=m.joined_at
            ))
    return ProjectResponse(
        id=p.id,
        name=p.name,
        description=p.description,
        owner_id=p.owner_id,
        owner=owner_res,
        members=members_res,
        created_at=p.created_at,
        updated_at=p.updated_at
    )

@router.get("/", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == "Admin":
        projects = db.query(Project).all()
    else:
        member_projects = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).all()
        project_ids = set([p[0] for p in member_projects] + [p.id for p in db.query(Project).filter(Project.owner_id == current_user.id).all()])
        projects = db.query(Project).filter(Project.id.in_(project_ids)).all() if project_ids else []
    
    return [format_project_response(p) for p in projects]

@router.post("/", response_model=ProjectResponse)
def create_project(req: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = Project(
        name=req.name,
        description=req.description,
        owner_id=current_user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Add owner as project member with PM role
    pm_member = ProjectMember(project_id=project.id, user_id=current_user.id, role="PM")
    db.add(pm_member)
    db.commit()
    db.refresh(project)

    return format_project_response(project)

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = verify_project_access(project_id, current_user, db)
    return format_project_response(project)

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, req: ProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = verify_project_access(project_id, current_user, db)
    if req.name is not None:
        project.name = req.name
    if req.description is not None:
        project.description = req.description
    db.commit()
    db.refresh(project)
    return format_project_response(project)

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = verify_project_access(project_id, current_user, db)
    db.delete(project)
    db.commit()
    return {"message": "Đã xóa dự án thành công"}

@router.post("/{project_id}/members", response_model=ProjectResponse)
def add_project_member(project_id: int, req: MemberAdd, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = verify_project_access(project_id, current_user, db)
    
    existing = db.query(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.user_id == req.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Thành viên đã có trong dự án")

    new_member = ProjectMember(project_id=project_id, user_id=req.user_id, role=req.role or "Member")
    db.add(new_member)
    db.commit()
    db.refresh(project)
    return format_project_response(project)

@router.delete("/{project_id}/members/{user_id}", response_model=ProjectResponse)
def remove_project_member(project_id: int, user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = verify_project_access(project_id, current_user, db)
    
    member = db.query(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Thành viên không nằm trong dự án")

    db.delete(member)
    db.commit()
    db.refresh(project)
    return format_project_response(project)

