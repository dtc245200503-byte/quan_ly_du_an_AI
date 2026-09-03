import json
import datetime
from backend.database import SessionLocal, Base, engine
from backend.models import User, Project, ProjectMember, Sprint, Task, TaskComment, MeetingNote, Meeting

from backend.auth import hash_password

def seed_data():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    print("[SEED] Populating database seed data for G9 - Quan Ly Du An...")

    # 1. Users
    u_admin = User(
        email="admin@g9.vn",
        phone_number="0988888888",
        password_hash=hash_password("admin123"),
        full_name="Nguyễn Văn Thanh",
        role="Admin",
        skills=json.dumps(["System Admin", "Security", "DevOps", "Python"], ensure_ascii=False),
        job_title="Chủ Tịch HĐQT / Admin",
        bio="Quản trị viên hệ thống G9.",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    )

    u_pm = User(
        email="pm@g9.vn",
        phone_number="0977777777",
        password_hash=hash_password("pm123"),
        full_name="Lữ Văn Chinh",
        role="PM",
        skills=json.dumps(["Project Management", "Agile", "Scrum", "Risk Management"], ensure_ascii=False),
        job_title="Senior Project Manager",
        bio="Chuyên gia quản lý dự án công nghệ trên 8 năm kinh nghiệm.",
        avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
    )

    u_dev1 = User(
        email="dev1@g9.vn",
        phone_number="0966666666",
        password_hash=hash_password("dev123"),
        full_name="Cao Phạm Phú Anh",
        role="Member",
        skills=json.dumps(["Python", "FastAPI", "SQLAlchemy", "SQLite", "Docker"], ensure_ascii=False),
        job_title="Dev Lead Developer",
        bio="Phát triển kiến trúc API hiệu năng cao và hệ thống CSDL.",
        avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
    )

    u_dev2 = User(
        email="dev2@g9.vn",
        phone_number="0955555555",
        password_hash=hash_password("dev123"),
        full_name="Đỗ Hoàng Long",
        role="Member",
        skills=json.dumps(["React", "Tailwind CSS", "TypeScript", "Vite", "UI/UX"], ensure_ascii=False),
        job_title="Frontend Lead Developer",
        bio="Đam mê tạo ra các giao diện người dùng mượt mà, chân thực.",
        avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
    )

    u_dev3 = User(
        email="dev3@g9.vn",
        phone_number="0933333333",
        password_hash=hash_password("dev123"),
        full_name="Phạm Minh Đức",
        role="Member",
        skills=json.dumps(["Python", "FastAPI", "PostgreSQL", "Redis", "Microservices"], ensure_ascii=False),
        job_title="Backend Developer",
        bio="Chuyên gia lập trình hệ thống backend và tối ưu thuật toán.",
        avatar_url="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150"
    )

    u_qa = User(
        email="qa@g9.vn",
        phone_number="0944444444",
        password_hash=hash_password("dev123"),
        full_name="Hoàng Thu Thảo",
        role="Member",
        skills=json.dumps(["Pytest", "Automation Test", "Jira", "SQL"], ensure_ascii=False),
        job_title="QA Lead Engineer",
        bio="Đảm bảo chất lượng sản phẩm và tối ưu trải nghiệm người dùng.",
        avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
    )

    db.add_all([u_admin, u_pm, u_dev1, u_dev2, u_dev3, u_qa])
    db.commit()
    for u in [u_admin, u_pm, u_dev1, u_dev2, u_dev3, u_qa]:
        db.refresh(u)

    # 2. Projects
    p1 = Project(
        name="Hệ Thống G9 - Quản Lý Dự Án SaaS",
        description="Ứng dụng quản lý dự án thế hệ mới tích hợp trí tuệ nhân tạo AI hỗ trợ phân công nhiệm vụ và tóm tắt biên bản họp.",
        owner_id=u_pm.id
    )

    p2 = Project(
        name="Ứng Dụng Mobile G9 Companion",
        description="Ứng dụng di động companion theo dõi thông báo và trao đổi nhanh dành cho các thành viên dự án G9.",
        owner_id=u_pm.id
    )

    db.add_all([p1, p2])
    db.commit()
    db.refresh(p1)
    db.refresh(p2)

    # 3. Project Members
    members = [
        ProjectMember(project_id=p1.id, user_id=u_admin.id, role="PM"),
        ProjectMember(project_id=p1.id, user_id=u_pm.id, role="PM"),
        ProjectMember(project_id=p1.id, user_id=u_dev1.id, role="Member"),
        ProjectMember(project_id=p1.id, user_id=u_dev2.id, role="Member"),
        ProjectMember(project_id=p1.id, user_id=u_dev3.id, role="Member"),
        ProjectMember(project_id=p1.id, user_id=u_qa.id, role="Member"),

        ProjectMember(project_id=p2.id, user_id=u_pm.id, role="PM"),
        ProjectMember(project_id=p2.id, user_id=u_dev2.id, role="Member"),
    ]
    db.add_all(members)
    db.commit()

    # 4. Sprints
    now = datetime.datetime.utcnow()
    sp1 = Sprint(
        project_id=p1.id,
        name="Sprint 1 — Core Auth & DB Architecture",
        goal="Xây dựng CSDL SQLite, Auth JWT, Đăng nhập Email/SĐT và luồng Quên mật khẩu.",
        status="Completed",
        start_date=now - datetime.timedelta(days=14),
        end_date=now - datetime.timedelta(days=2)
    )

    sp2 = Sprint(
        project_id=p1.id,
        name="Sprint 2 — Kanban Board & UI Dashboard",
        goal="Xây dựng giao diện React + Tailwind, Kanban kéo thả mượt mà và biểu đồ Workload.",
        status="Active",
        start_date=now - datetime.timedelta(days=1),
        end_date=now + datetime.timedelta(days=12)
    )

    sp3 = Sprint(
        project_id=p1.id,
        name="Sprint 3 — AI Hub & System Reports",
        goal="Tích hợp 3 chức năng AI (Weekly Summary, Meeting Minutes, Smart Assignment).",
        status="Planning",
        start_date=now + datetime.timedelta(days=13),
        end_date=now + datetime.timedelta(days=27)
    )

    db.add_all([sp1, sp2, sp3])
    db.commit()
    db.refresh(sp1)
    db.refresh(sp2)
    db.refresh(sp3)

    # 5. Tasks
    t1 = Task(
        project_id=p1.id,
        sprint_id=sp1.id,
        title="Thiết kế CSDL SQLite & Schema ERD",
        description="Định nghĩa các bảng Users, Projects, Sprints, Tasks, Comments và Attachments chuẩn ERD v5.",
        status="Done",
        priority="High",
        assignee_id=u_dev1.id,
        reporter_id=u_pm.id,
        due_date=now - datetime.timedelta(days=5),
        estimated_hours=8.0
    )

    t2 = Task(
        project_id=p1.id,
        sprint_id=sp1.id,
        title="Tích hợp Auth JWT Bearer & Revoked Token",
        description="Viết middleware xác thực Bearer Auth, băm mật khẩu bcrypt và thu hồi token khi đăng xuất.",
        status="Done",
        priority="Urgent",
        assignee_id=u_dev1.id,
        reporter_id=u_pm.id,
        due_date=now - datetime.timedelta(days=3),
        estimated_hours=12.0
    )

    t3 = Task(
        project_id=p1.id,
        sprint_id=sp2.id,
        title="Phát triển Bảng Kanban kéo-thả dnd-kit",
        description="Tạo các cột Todo, InProgress, Review, Done với micro-interactions kéo thả mượt mà.",
        status="InProgress",
        priority="Urgent",
        assignee_id=u_dev2.id,
        reporter_id=u_pm.id,
        due_date=now + datetime.timedelta(days=2),
        estimated_hours=16.0
    )

    t4 = Task(
        project_id=p1.id,
        sprint_id=sp2.id,
        title="Viết Unit Test (pytest) cho Task & Reports",
        description="Đảm bảo độ bao phủ kiểm thử cho các API cốt lõi và thuật toán báo cáo.",
        status="Review",
        priority="High",
        assignee_id=u_qa.id,
        reporter_id=u_pm.id,
        due_date=now - datetime.timedelta(days=1), # OVERDUE for demonstration
        estimated_hours=10.0
    )

    t5 = Task(
        project_id=p1.id,
        sprint_id=sp2.id,
        title="Tối ưu hóa giao diện Modern Corporate Blue",
        description="Áp dụng mã màu #2563EB accent và nền sáng #F8FAFC, tinh chỉnh typography chuyên nghiệp.",
        status="Todo",
        priority="Medium",
        assignee_id=u_dev2.id,
        reporter_id=u_pm.id,
        due_date=now - datetime.timedelta(days=2), # OVERDUE for demonstration
        estimated_hours=6.0
    )

    t6 = Task(
        project_id=p1.id,
        sprint_id=sp3.id,
        title="Tích hợp AI Gợi Ý Phân Công Nhiệm Vụ",
        description="Tính toán điểm Skill_Match và Workload_Score để đưa ra ứng viên tối ưu nhất.",
        status="Todo",
        priority="High",
        assignee_id=u_dev1.id,
        reporter_id=u_pm.id,
        due_date=now + datetime.timedelta(days=15),
        estimated_hours=14.0
    )

    db.add_all([t1, t2, t3, t4, t5, t6])
    db.commit()
    db.refresh(t3)

    # 6. Task Comments
    c1 = TaskComment(
        task_id=t3.id,
        user_id=u_pm.id,
        content="Giao diện Kanban kéo thả rất mượt! Lưu ý kiểm tra lại trên thiết bị màn hình nhỏ."
    )
    c2 = TaskComment(
        task_id=t3.id,
        user_id=u_dev2.id,
        content="Đã tinh chỉnh hiệu ứng drop animation. Đang kết nối API PATCH /api/tasks/{id}."
    )
    db.add_all([c1, c2])
    db.commit()

    # 7. Meeting Notes
    m1 = MeetingNote(
        project_id=p1.id,
        title="Cuộc họp khởi động Sprint 2 & Đánh giá rủi ro",
        content="Thảo luận tiến độ phát triển Frontend React + Tailwind CSS. Thống nhất áp dụng bảng màu Modern Corporate Blue #2563EB. Cần ưu tiên xử lý các task trễ hạn.",
        ai_summary="Biên bản cuộc họp Sprint 2: Thống nhất áp dụng bảng màu Modern Corporate Blue, thúc đẩy tiến độ hoàn thành các nhiệm vụ quá hạn và kết nối API Kanban.",
        action_items=json.dumps([
            "Hoàn thiện kéo thả Kanban Board trong tuần",
            "Viết đầy đủ unit tests cho module Task và Sprint",
            "Cập nhật hồ sơ cá nhân và kỹ năng thành viên"
        ], ensure_ascii=False),
        created_by=u_pm.id
    )
    db.add(m1)
    db.commit()

    # 8. Online Meetings
    mt1 = Meeting(
        project_id=p1.id,
        title="Họp Đồng Bộ Tiến Độ Sprint 2 & Demo UI/UX Netflix Mode",
        platform="Google Meet",
        meeting_link="https://meet.google.com/g9-pm-demo",
        start_time=now + datetime.timedelta(hours=2),
        created_by=u_pm.id,
        participants=json.dumps([u_pm.id, u_dev1.id, u_dev2.id, u_qa.id], ensure_ascii=False)
    )

    mt2 = Meeting(
        project_id=p1.id,
        title="Họp Lập Kế Hoạch AI Chat Copilot Engine & RAG Context",
        platform="Jitsi Meet",
        meeting_link="https://meet.jit.si/g9-ai-copilot-planning",
        start_time=now + datetime.timedelta(days=1, hours=4),
        created_by=u_dev1.id,
        participants=json.dumps([u_admin.id, u_pm.id, u_dev1.id, u_dev3.id], ensure_ascii=False)
    )

    db.add_all([mt1, mt2])
    db.commit()

    print("[SUCCESS] Seed data populated successfully!")

    print("   Admin: admin@g9.vn / admin123")
    print("   PM:    pm@g9.vn / pm123")
    print("   Dev1:  dev1@g9.vn / dev123")

if __name__ == "__main__":
    seed_data()
