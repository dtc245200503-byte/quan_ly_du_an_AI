import json
import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.models import Project, Task, User, ProjectMember, MeetingNote

class AIService:
    def generate_weekly_summary(self, db: Session, project_id: int) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Không tìm thấy dự án")

        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        now = datetime.datetime.utcnow()

        completed = [t for t in tasks if t.status == "Done"]
        pending = [t for t in tasks if t.status != "Done"]
        overdue = [t for t in tasks if t.due_date and t.due_date < now and t.status != "Done"]

        total_hours = sum(t.estimated_hours for t in tasks)
        done_hours = sum(t.estimated_hours for t in completed)
        completion_rate = round((len(completed) / len(tasks) * 100), 1) if tasks else 0.0

        risks = []
        if len(overdue) > 0:
            risks.append(f"Có {len(overdue)} nhiệm vụ đã quá hạn hoàn thành cần ưu tiên xử lý gấp.")
        if len(pending) > len(completed) * 2:
            risks.append("Tải công việc tồn đọng (Backlog) đang tăng nhanh hơn tiến độ hoàn thành.")
        if not risks:
            risks.append("Tiến độ dự án đang diễn ra đúng kế hoạch, không có rủi ro lớn.")

        priorities = []
        if overdue:
            priorities.append(f"Tập trung hoàn thiện task quá hạn: '{overdue[0].title}'")
        priorities.append("Hoàn tất các nhiệm vụ đang ở trạng thái In Progress & Review")
        priorities.append("Họp kiểm tra tiến độ giữa tuần với các thành viên dự án")

        summary_text = (
            f"Báo cáo tiến độ dự án '{project.name}': Dự án hiện có {len(tasks)} nhiệm vụ với tỷ lệ hoàn thành {completion_rate}%. "
            f"Đã hoàn thành {len(completed)} nhiệm vụ ({done_hours}/{total_hours}h), đang còn {len(pending)} nhiệm vụ tồn đọng. "
            f"Đánh giá chung: Tiến độ tích cực, các thành viên hoạt động ổn định."
        )

        return {
            "project_id": project.id,
            "summary": summary_text,
            "completed_tasks_count": len(completed),
            "pending_tasks_count": len(pending),
            "overdue_tasks_count": len(overdue),
            "risks": risks,
            "priorities": priorities
        }

    def generate_meeting_minutes(self, db: Session, project_id: int, user_id: int, title: str, raw_notes: str) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Không tìm thấy dự án")

        lines = [line.strip() for line in raw_notes.split("\n") if line.strip()]
        
        # Extract action items from bullet points or lines containing key terms
        action_items = []
        summary_paragraphs = []

        for line in lines:
            if line.startswith("-") or line.startswith("*") or "cần" in line.lower() or "phải" in line.lower() or "giao" in line.lower():
                clean_item = line.lstrip("-*1234567890. ").strip()
                action_items.append(clean_item)
            else:
                summary_paragraphs.append(line)

        if not action_items:
            action_items = ["Cập nhật tiến độ nhiệm vụ trên bảng Kanban", "Chuẩn bị tài liệu cho buổi họp tiếp theo"]

        ai_summary = f"Biên bản cuộc họp '{title}' cho dự án {project.name}. Thảo luận các mục chính: " + " ".join(summary_paragraphs if summary_paragraphs else [raw_notes])

        note = MeetingNote(
            project_id=project_id,
            title=title,
            content=raw_notes,
            ai_summary=ai_summary,
            action_items=json.dumps(action_items, ensure_ascii=False),
            created_by=user_id
        )
        db.add(note)
        db.commit()
        db.refresh(note)

        return {
            "note_id": note.id,
            "project_id": project_id,
            "title": title,
            "ai_summary": ai_summary,
            "action_items": action_items
        }

    def suggest_assignment(self, db: Session, project_id: int, task_title: str, required_skills: List[str]) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Không tìm thấy dự án")

        # Get project members
        member_records = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
        member_ids = [m.user_id for m in member_records]
        if not member_ids:
            # Fallback to owner if no members
            member_ids = [project.owner_id]

        users = db.query(User).filter(User.id.in_(member_ids)).all()

        candidates = []
        req_set = set(s.lower().strip() for s in required_skills)

        for u in users:
            try:
                user_skills = json.loads(u.skills) if u.skills else []
            except Exception:
                user_skills = [s.strip() for s in u.skills.split(",")] if u.skills else []
            
            user_skill_set = set(s.lower().strip() for s in user_skills)

            # Calculate Skill Match Score (0.0 to 100.0)
            if req_set:
                matches = req_set.intersection(user_skill_set)
                skill_match_score = round((len(matches) / len(req_set)) * 100, 1)
            else:
                skill_match_score = 100.0

            # Calculate Current Workload (Sum of estimated hours for non-Done tasks)
            active_tasks = db.query(Task).filter(Task.assignee_id == u.id, Task.status != "Done").all()
            workload_hours = sum(t.estimated_hours for t in active_tasks)

            # Calculate Workload Score (Higher score for lower workload, e.g. max 40 hours limit)
            max_capacity = 40.0
            workload_score = max(0.0, round(((max_capacity - min(workload_hours, max_capacity)) / max_capacity) * 100, 1))

            # Final Score: 60% Skill Match + 40% Workload Capacity
            final_score = round((0.6 * skill_match_score) + (0.4 * workload_score), 1)

            reason = (
                f"Sở hữu {len(user_skill_set.intersection(req_set))}/{len(req_set)} kỹ năng yêu cầu. "
                f"Khối lượng công việc hiện tại là {workload_hours}h (Đánh giá khả năng nhận thêm việc: {workload_score}%)."
            )

            candidates.append({
                "user_id": u.id,
                "full_name": u.full_name,
                "job_title": u.job_title or "Thành viên",
                "skills": user_skills,
                "skill_match_score": skill_match_score,
                "current_workload_hours": workload_hours,
                "final_score": final_score,
                "reason": reason
            })

        # Sort by final score descending
        candidates.sort(key=lambda x: x["final_score"], reverse=True)
        best_candidate = candidates[0] if candidates else None

        return {
            "project_id": project_id,
            "task_title": task_title,
            "required_skills": required_skills,
            "suggested_assignee": best_candidate,
            "all_candidates": candidates
        }

ai_service = AIService()
