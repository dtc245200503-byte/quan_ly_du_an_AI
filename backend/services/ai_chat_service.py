import json
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models import Project, Task, User, ProjectMember, Sprint, Meeting

SYSTEM_PERSONA_PROMPT = """Bạn là 'Chuyên gia Quản trị Dự án Senior G9' - trợ lý AI thông minh tích hợp trong Hệ thống Quản lý Dự án G9 Corporate SaaS.
Phong cách làm việc của bạn: Professional, sắc bén, mang tính tư vấn chiến lược cao, nhiệt tình và thân thiện với tiếng Việt tự nhiên.

Nhiệm vụ chính:
1. Giải đáp các thắc mắc về tiến độ, rủi ro, phân công task, lịch họp và tình trạng của dự án dựa trên DỮ LIỆU THỰC TẾ được cung cấp dưới đây.
2. Đưa ra lời khuyên cụ thể, hành động tiếp theo (action items) rõ ràng và cấu trúc phản hồi bằng Markdown dễ đọc, đẹp mắt (sử dụng bullet points, bold text, code block nếu cần).
3. Nếu người dùng hỏi ngoài phạm vi dự án, hãy đưa ra tư vấn quản trị dự án chuẩn Agile/Scrum/Kanban hoặc trả lời ngắn gọn lịch sự.
"""

class AIChatService:
    def get_project_context(self, db: Session, project_id: Optional[int]) -> Dict[str, Any]:
        if not project_id:
            return {"status": "No project selected"}

        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"status": "Project not found"}

        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        sprints = db.query(Sprint).filter(Sprint.project_id == project_id).all()
        meetings = db.query(Meeting).filter(Meeting.project_id == project_id).all()
        
        # Get project members
        member_records = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
        member_ids = [m.user_id for m in member_records]
        if project.owner_id not in member_ids:
            member_ids.append(project.owner_id)
        
        users = db.query(User).filter(User.id.in_(member_ids)).all() if member_ids else []
        user_dict = {u.id: u.full_name for u in users}

        now = datetime.datetime.utcnow()

        completed_tasks = [t for t in tasks if t.status == "Done"]
        in_progress_tasks = [t for t in tasks if t.status == "InProgress"]
        todo_tasks = [t for t in tasks if t.status == "Todo"]
        review_tasks = [t for t in tasks if t.status == "Review"]
        overdue_tasks = [t for t in tasks if t.due_date and t.due_date < now and t.status != "Done"]

        # Workload per user
        workload_map = {}
        for u in users:
            u_tasks = [t for t in tasks if t.assignee_id == u.id and t.status != "Done"]
            u_hours = sum(t.estimated_hours for t in u_tasks)
            workload_map[u.full_name] = {
                "active_task_count": len(u_tasks),
                "total_hours": u_hours
            }

        # Upcoming meetings
        upcoming_meetings = [
            {
                "title": m.title,
                "platform": m.platform,
                "start_time": m.start_time.strftime("%Y-%m-%d %H:%M"),
                "link": m.meeting_link
            }
            for m in meetings if m.start_time >= now - datetime.timedelta(hours=2)
        ]

        return {
            "project_name": project.name,
            "project_description": project.description or "Không có mô tả",
            "total_tasks": len(tasks),
            "completed_tasks": len(completed_tasks),
            "in_progress_tasks": len(in_progress_tasks),
            "todo_tasks": len(todo_tasks),
            "review_tasks": len(review_tasks),
            "overdue_tasks_count": len(overdue_tasks),
            "overdue_task_titles": [t.title for t in overdue_tasks[:5]],
            "active_sprints": [s.name for s in sprints if s.status == "Active"],
            "total_sprints": len(sprints),
            "members": [u.full_name for u in users],
            "member_workload": workload_map,
            "upcoming_meetings": upcoming_meetings
        }

    def generate_chat_response(
        self, 
        db: Session, 
        project_id: Optional[int], 
        message: str, 
        history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        context = self.get_project_context(db, project_id)
        msg_lower = message.lower().strip()

        # Build dynamic context string for system prompt injection (RAG light)
        context_str = f"=== DỮ LIỆU THỰC TẾ DỰ ÁN '{context.get('project_name', 'Hệ thống G9')}' ===\n"
        if "project_name" in context:
            context_str += f"- Tổng số Nhiệm vụ: {context['total_tasks']} (Done: {context['completed_tasks']}, In Progress: {context['in_progress_tasks']}, Review: {context['review_tasks']}, Todo: {context['todo_tasks']})\n"
            context_str += f"- Nhiệm vụ Quá Hạn: {context['overdue_tasks_count']}"
            if context['overdue_task_titles']:
                context_str += f" ({', '.join(context['overdue_task_titles'])})\n"
            else:
                context_str += "\n"
            context_str += f"- Sprint Đang Kích Hoạt: {', '.join(context['active_sprints']) if context['active_sprints'] else 'Không có'}\n"
            context_str += f"- Thành Viên Dự Án: {', '.join(context['members'])}\n"
            context_str += "- Tải Công Việc Thành Viên:\n"
            for m_name, info in context['member_workload'].items():
                context_str += f"  + {m_name}: {info['active_task_count']} tasks đang làm, tổng {info['total_hours']}h\n"
            if context['upcoming_meetings']:
                context_str += "- Lịch Họp Sắp Tới:\n"
                for mt in context['upcoming_meetings']:
                    context_str += f"  + [{mt['platform']}] {mt['title']} lúc {mt['start_time']} (Link: {mt['link']})\n"

        # Specialized response generators for typical queries with rich dynamic project data
        if any(kw in msg_lower for kw in ["tóm tắt", "tiến độ", "overview", "tình hình"]):
            total = context.get('total_tasks', 0)
            done = context.get('completed_tasks', 0)
            in_prog = context.get('in_progress_tasks', 0)
            overdue = context.get('overdue_tasks_count', 0)
            pct = round((done / total * 100), 1) if total > 0 else 0

            reply = f"### 📊 Báo Cáo Tiến Độ Dự Án **{context.get('project_name', 'G9')}**\n\n"
            reply += f"Chào bạn! Tôi đã tổng hợp nhanh tiến độ hiện tại của dự án:\n\n"
            reply += f"- **Tỷ lệ hoàn thành:** `{pct}%` ({done}/{total} nhiệm vụ)\n"
            reply += f"- **Nhiệm vụ đang thực hiện (In Progress):** {in_prog} tasks\n"
            reply += f"- **Nhiệm vụ quá hạn:** {overdue} tasks {('⚠️ *cần xử lý ngay*' if overdue > 0 else '✅ *rất tốt, không có task quá hạn*')}\n"
            reply += f"- **Sprint hiện tại:** {', '.join(context.get('active_sprints', ['Chưa mở Sprint']))}\n\n"
            
            reply += "#### 💡 Đề xuất hành động tiếp theo:\n"
            if overdue > 0:
                reply += f"1. Ưu tiên giải quyết các task quá hạn: `{', '.join(context.get('overdue_task_titles', []))}`\n"
            reply += "2. Tổ chức họp Daily Sync 15 phút rà soát các blocker của team.\n"
            reply += "3. Kiểm tra lại phân công công việc các thành viên để đảm bảo tiến độ."

        elif any(kw in msg_lower for kw in ["quá tải", "tải công việc", "phân công", "workload", "ai đang"]):
            reply = f"### ⚖️ Phân Tích Tải Công Việc Thành Viên (**{context.get('project_name', 'Dự án')}**)\n\n"
            reply += "Dưới đây là thống kê khối lượng công việc hiện tại của từng thành viên:\n\n"
            
            workload_items = context.get('member_workload', {})
            sorted_workload = sorted(workload_items.items(), key=lambda x: x[1]['total_hours'], reverse=True)
            
            for m_name, info in sorted_workload:
                status_icon = "🔴 (Tải cao)" if info['total_hours'] >= 30 else ("🟡 (Vừa phải)" if info['total_hours'] >= 15 else "🟢 (Rảnh rỗi)")
                reply += f"- **{m_name}**: `{info['active_task_count']} tasks` | `{info['total_hours']} giờ` -> {status_icon}\n"

            reply += "\n#### 🎯 Khuyến nghị từ Chuyên gia G9:\n"
            if sorted_workload:
                busiest = sorted_workload[0][0]
                lightest = sorted_workload[-1][0]
                reply += f"- Nên điều chuyển bớt một số task từ **{busiest}** sang cho **{lightest}** để cân bằng tải cho Sprint sắp tới.\n"
            reply += "- Đảm bảo không thành viên nào vượt quá 40h ước tính/Sprint."

        elif any(kw in msg_lower for kw in ["họp", "cuộc họp", "meeting", "lịch họp"]):
            meetings = context.get('upcoming_meetings', [])
            reply = f"### 📅 Lịch Họp Nhóm Online (**{context.get('project_name', 'Dự án')}**)\n\n"
            if meetings:
                reply += f"Hiện tại dự án đang có **{len(meetings)} cuộc họp sắp diễn ra**:\n\n"
                for idx, mt in enumerate(meetings, 1):
                    reply += f"{idx}. **{mt['title']}**\n"
                    reply += f"   - Nền tảng: `{mt['platform']}`\n"
                    reply += f"   - Thời gian: `{mt['start_time']}`\n"
                    reply += f"   - Link tham gia: [{mt['link']}]({mt['link']})\n\n"
            else:
                reply += "Chưa có cuộc họp online nào được lên lịch cho dự án này.\n\n"
                reply += "👉 Bạn có thể bấm nút **'Tổ chức cuộc họp'** tại tab *Cuộc Họp Online* hoặc mở *Task Detail* để sinh link meeting nhanh (Google Meet / Jitsi Meet)."

        elif any(kw in msg_lower for kw in ["gợi ý", "phân công task", "assign"]):
            reply = f"### 🤖 Gợi Ý Phân Công Nhiệm Vụ Tự Động\n\n"
            reply += "Thuật toán AI G9 đánh giá khả năng nhận việc dựa trên **60% Skill Match** + **40% Workload Capacity**.\n\n"
            reply += "Các bước phân công tối ưu:\n"
            reply += "1. Truy cập tab **AI Hub -> 3. Gợi Ý Phân Công Nhiệm Vụ**\n"
            reply += "2. Nhập tiêu đề Task và các Kỹ năng bắt buộc (ví dụ: `Python, FastAPI, React`)\n"
            reply += "3. AI sẽ tự động chấm điểm và đề xuất ứng viên tốt nhất kèm lý do chi tiết.\n"

        else:
            # General AI Response with persona and context
            reply = f"Chào bạn! Tôi là **Trợ lý AI Quản trị Dự án Senior G9**.\n\n"
            reply += f"Tôi đang theo dõi dự án **{context.get('project_name', 'G9')}** với tổng số **{context.get('total_tasks', 0)} nhiệm vụ** và **{len(context.get('members', []))} thành viên**.\n\n"
            reply += f"Tôi có thể hỗ trợ bạn:\n"
            reply += f"- 📈 **Báo cáo & Tóm tắt tiến độ** tuần/Sprint thời gian thực.\n"
            reply += f"- ⚖️ **Phân tích tải công việc (Workload)** xem ai đang quá tải.\n"
            reply += f"- 📅 **Tổng hợp lịch họp online** & gửi link tham gia nhanh.\n"
            reply += f"- 💡 **Tư vấn giải pháp Agile/Scrum** tối ưu quy trình làm việc.\n\n"
            reply += f"Bạn muốn tôi hỗ trợ thông tin gì cho dự án hôm nay?"

        suggested_actions = [
            "Tóm tắt tiến độ tuần này",
            "Ai đang quá tải công việc?",
            "Các cuộc họp sắp tới",
            "Gợi ý phân công task X"
        ]

        return {
            "reply": reply,
            "suggested_actions": suggested_actions,
            "context_used": {
                "project_name": context.get("project_name"),
                "total_tasks": context.get("total_tasks"),
                "overdue_tasks": context.get("overdue_tasks_count")
            }
        }

ai_chat_service = AIChatService()
