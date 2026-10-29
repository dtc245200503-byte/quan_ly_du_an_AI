from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.models import Project, ProjectMember, User

def has_project_access(project_id: int, user: User, db: Session) -> bool:
    """
    Check if user is allowed to access the specified project.
    Admins have global access.
    Non-admins must be either the owner or a member in ProjectMember table.
    """
    if not user:
        return False

    if user.role == "Admin":
        return True

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return False

    if project.owner_id == user.id:
        return True

    is_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id
    ).first()

    return is_member is not None

def has_project_manage_access(project_id: int, user: User, db: Session) -> bool:
    """
    Quyền QUẢN LÝ dự án (sửa/xóa project, thêm/xóa thành viên).
    Chặt hơn has_project_access: chỉ Admin, chủ dự án (owner), hoặc thành viên có role PM.
    """
    if not user:
        return False

    if user.role == "Admin":
        return True

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return False

    if project.owner_id == user.id:
        return True

    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id
    ).first()

    return membership is not None and membership.role == "PM"


def verify_project_manage_access(project_id: int, user: User, db: Session) -> Project:
    """
    Verifies the user has MANAGE-level access to the project (Admin / owner / PM),
    raises 404 if project doesn't exist, or 403 if user lacks manage permission.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy dự án"
        )

    if not has_project_manage_access(project_id, user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ chủ dự án, quản lý (PM) hoặc Admin mới có quyền thực hiện thao tác này"
        )

    return project


def verify_project_access(project_id: int, user: User, db: Session) -> Project:
    """
    Verifies project access and returns the Project object.
    Raises 404 if project doesn't exist, or 403 if user has no permission.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy dự án"
        )

    if not has_project_access(project_id, user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập dự án này"
        )

    return project
