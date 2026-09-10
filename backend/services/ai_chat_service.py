import json
import datetime
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import Project, Task, User, ProjectMember, Sprint, Meeting

SYSTEM_PERSONA_PROMPT = """Bạn là một Senior Project Manager (PM) sắc bén và khắt khe. Nhiệm vụ của bạn là phân tích dữ liệu JSON dự án được truyền vào và xuất ra báo cáo tiến độ chi tiết.

RÀNG BUỘC PHÂN TÍCH:
- KHÔNG trả lời chung chung. Mọi nhận định rủi ro hoặc hành động BẮT BỘC phải chỉ đích danh: [Tên Task] - [Người phụ trách @Assignee] - [Số ngày trễ].
- LOGIC KIỂM TRA: Nếu % hoàn thành = 0% VÀ có task quá hạn -> Trạng thái BẮT BỘC là 🚨 BÁO ĐỘNG (Không được đánh giá là tiến độ tích cực).
- Chỉ rõ Bottleneck (thành viên nào đang quá tải, task nào đang làm tắc nghẽn Sprint).

ĐỊNH DẠNG ĐẦU RA BẮT BỘC (MARKDOWN):
📊 TÌNH TRẠNG SỨC KHỎE DỰ ÁN
• Trạng thái: 🚨 BÁO ĐỘNG / ⚠️ CẢNH BÁO / ✅ TỐT - [Lý do ngắn gọn]
• Chỉ số: [Completed]/[Total] tasks ([%]) | Số task quá hạn: [X] | Tổng giờ: [Done]/[Total]h

🚨 CÁC MỐI ĐỌA NGHỄN TIẾN ĐỘ (CẦN XỬ LÝ NGAY)
1. Task: "[Tên task 1]" | Phụ trách: @[Tên] | Hạn chót: [Date] (Quá hạn X ngày) -> Tác động: [Đánh giá]
2. Task: "[Tên task 2]" | Phụ trách: @[Tên] | Hạn chót: [Date] (Quá hạn Y ngày)

👥 PHÂN BỔ TẢI CÔNG VIỆC (WORKLOAD)
• @[Tên A]: [X] tasks ([Y]h) 🔴 Quá tải (Cần san sẻ bớt)
• @[Tên B]: [X] tasks ([Y]h) 🟢 Vừa sức / Đang rảnh

🎯 KẾ HOẠCH HÀNH ĐỘNG CỤ THỂ (ACTION PLAN)
1. [Hành động 1 có tên task và tên người phụ trách]
2. [Hành động 2]
3. [Hành động 3]"""


class BaseAIProvider(ABC):
    """
    Abstract AI Provider Interface theo mô hình AI Provider Adapter / Strategy Pattern (Báo cáo Hình 2.4.5)
    """
    @abstractmethod
    def generate(
        self,
        system_prompt: str,
        context_str: str,
        message: str,
        history: List[Dict[str, str]],
        context_data: Optional[Dict[str, Any]] = None
    ) -> str:
        pass


class LLMProvider(BaseAIProvider):
    """
    Implementation gọi Claude LLM API (Anthropic SDK)
    """
    def generate(
        self,
        system_prompt: str,
        context_str: str,
        message: str,
        history: List[Dict[str, str]],
        context_data: Optional[Dict[str, Any]] = None
    ) -> str:
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY chưa được cấu hình trong biến môi trường.")

        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        full_system_prompt = f"{system_prompt}\n\n{context_str}"

        # Quy định R3: Sliding Window cho history (chỉ lấy tối đa 10 tin nhắn gần nhất)
        recent_history = history[-10:] if history else []

        formatted_messages = []
        for msg in recent_history:
            role = msg.get("role")
            if role in ["user", "assistant"]:
                content = msg.get("content", "").strip()
                if content:
                    formatted_messages.append({"role": role, "content": content})

        # Append current user message
        formatted_messages.append({"role": "user", "content": message.strip()})

        # Ensure history starts with 'user' role for Anthropic API requirements
        while formatted_messages and formatted_messages[0]["role"] != "user":
            formatted_messages.pop(0)

        if not formatted_messages:
            formatted_messages = [{"role": "user", "content": message.strip()}]

        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1024,
            system=full_system_prompt,
            messages=formatted_messages
        )

        return response.content[0].text


class RuleBasedProvider(BaseAIProvider):
    """
    Implementation fallback dùng Rule-based / Keyword matching + template f-string
    """
    def generate(
        self,
        system_prompt: str,
        context_str: str,
        message: str,
        history: List[Dict[str, str]],
        context_data: Optional[Dict[str, Any]] = None
    ) -> str:
        context = context_data or {}
        msg_lower = message.lower().strip()

        # Specialized response generators for typical queries with rich dynamic project data
        if any(kw in msg_lower for kw in ["tóm tắt", "tiến độ", "overview", "tình hình", "sức khỏe"]):
            total = context.get('total_tasks', 0)
            done = context.get('completed_tasks', 0)
            in_prog = context.get('in_progress_tasks', 0)
            overdue_count = context.get('overdue_tasks_count', 0)
            pct = round((done / total * 100), 1) if total > 0 else 0.0

            tasks_list = context.get('all_task_summaries', [])
            total_hours = sum(t.get('estimated_hours', 0.0) or 0.0 for t in tasks_list)
            done_hours = sum(t.get('estimated_hours', 0.0) or 0.0 for t in tasks_list if t.get('status') == 'Done')

            # MANDATORY LOGIC: If % complete = 0% AND overdue > 0 -> BÁO ĐỘNG
            if pct == 0.0 and overdue_count > 0:
                health_status = "🚨 BÁO ĐỘNG"
                health_reason = f"Dự án chưa hoàn thành task nào (0%) và đang có {overdue_count} task bị quá hạn!"
            elif overdue_count > 0:
                health_status = "⚠️ CẢNH BÁO"
                health_reason = f"Có {overdue_count} task bị quá hạn trễ tiến độ."
            else:
                health_status = "✅ TỐT"
                health_reason = "Tiến độ diễn ra đúng kế hoạch, không có task quá hạn."

            reply = f"📊 TÌNH TRẠNG SỨC KHỎE DỰ ÁN\n"
            reply += f"• Trạng thái: {health_status} - {health_reason}\n"
            reply += f"• Chỉ số: {done}/{total} tasks ({pct}%) | Số task quá hạn: {overdue_count} | Tổng giờ: {done_hours}/{total_hours}h\n\n"

            reply += f"🚨 CÁC MỐI ĐỌA NGHỄN TIẾN ĐỘ (CẦN XỬ LÝ NGAY)\n"
            overdue_tasks = [t for t in tasks_list if t.get('is_overdue')]
            if overdue_tasks:
                for idx, ot in enumerate(overdue_tasks[:5], 1):
                    reply += f"{idx}. Task: \"{ot['task_name']}\" | Phụ trách: @{ot['assignee_name']} | Hạn chót: {ot['due_date']} (Quá hạn {ot['days_overdue']} ngày) -> Tác động: Gây trễ tiến độ Sprint\n"
            else:
                reply += "Không có task nào bị quá hạn.\n"

            reply += f"\n👥 PHÂN BỔ TẢI CÔNG VIỆC (WORKLOAD)\n"
            workload_items = context.get('member_workload', {})
            if workload_items:
                for m_name, info in workload_items.items():
                    if info['total_hours'] >= 30:
                        wl_tag = "🔴 Quá tải (Cần san sẻ bớt)"
                    else:
                        wl_tag = "🟢 Vừa sức / Đang rảnh"
                    reply += f"• @{m_name}: {info['active_task_count']} tasks ({info['total_hours']}h) {wl_tag}\n"
            else:
                reply += "Chưa có thông tin tải công việc.\n"

            reply += f"\n🎯 KẾ HOẠCH HÀNH ĐỘNG CỤ THỂ (ACTION PLAN)\n"
            if overdue_tasks:
                first_ot = overdue_tasks[0]
                reply += f"1. Ưu tiên tập trung xử lý gấp task '{first_ot['task_name']}' do @{first_ot['assignee_name']} phụ trách (đã trễ {first_ot['days_overdue']} ngày).\n"
                reply += f"2. Điều chuyển bớt tải công việc từ các thành viên quá tải sang người đang rảnh.\n"
                reply += f"3. Tổ chức họp Daily Standup 15 phút rà soát bottleneck tiến độ.\n"
            else:
                reply += f"1. Tiếp tục duy trì tiến độ các task đang ở trạng thái In Progress.\n"
                reply += f"2. Kiểm tra backlog để chuẩn bị kế hoạch cho Sprint tiếp theo.\n"
                reply += f"3. Đánh giá chất lượng các task đang thuộc trạng thái Review.\n"

            return reply


        elif any(kw in msg_lower for kw in ["quá tải", "tải công việc", "workload", "ai đang quá tải"]):
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
            return reply

        # Phase 5 expansion: Thành viên rảnh nhất
        elif any(kw in msg_lower for kw in ["rảnh", "rảnh nhất", "thành viên rảnh", "available"]):
            workload_items = context.get('member_workload', {})
            sorted_workload = sorted(workload_items.items(), key=lambda x: x[1]['total_hours'])
            reply = f"### 🟢 Thành Viên Có Khả Năng Nhận Thêm Việc (**{context.get('project_name', 'Dự án')}**)\n\n"
            if sorted_workload:
                reply += "Danh sách thành viên xếp theo thứ tự ít tải nhất:\n\n"
                for m_name, info in sorted_workload:
                    reply += f"- **{m_name}**: Đang làm `{info['active_task_count']} tasks` (`{info['total_hours']}h` tổng ước tính)\n"
                lightest = sorted_workload[0][0]
                reply += f"\n👉 **Khuyến nghị:** **{lightest}** đang là thành viên rảnh nhất, thích hợp nhất để giao thêm task mới."
            else:
                reply += "Chưa có thông tin tải công việc của các thành viên trong dự án."
            return reply

        # Phase 5 expansion: Deadline sắp tới
        elif any(kw in msg_lower for kw in ["deadline", "hạn chót", "sắp tới", "quá hạn"]):
            overdue_count = context.get('overdue_tasks_count', 0)
            overdue_titles = context.get('overdue_task_titles', [])
            upcoming_tasks = context.get('upcoming_tasks', [])

            reply = f"### ⏳ Tổng Hợp Deadline & Tiến Độ Hạn Chót (**{context.get('project_name', 'Dự án')}**)\n\n"
            if overdue_count > 0:
                reply += f"🚨 **Cảnh báo quá hạn:** Có **{overdue_count} nhiệm vụ quá hạn**: `{', '.join(overdue_titles)}`.\n\n"
            else:
                reply += "✅ **Tuyệt vời:** Không có nhiệm vụ nào bị quá hạn.\n\n"

            if upcoming_tasks:
                reply += "📅 **Các nhiệm vụ có deadline gần nhất:**\n"
                for t in upcoming_tasks:
                    reply += f"- **{t['title']}**: Hạn chót `{t['due_date']}` (Trạng thái: `{t['status']}`)\n"
            else:
                reply += f"Dự án hiện có `{context.get('total_tasks', 0)}` nhiệm vụ, trong đó `{context.get('in_progress_tasks', 0)}` nhiệm vụ đang In Progress."
            return reply

        # Phase 5 expansion: Hỏi thông tin 1 task cụ thể theo tên hoặc từ khóa "nhiệm vụ"/"task"
        elif any(kw in msg_lower for kw in ["nhiệm vụ", "task", "chi tiết task"]):
            task_list = context.get('all_task_summaries', [])
            matched_tasks = [t for t in task_list if any(term in t['title'].lower() for term in msg_lower.split())]
            if matched_tasks:
                t = matched_tasks[0]
                reply = f"### 📌 Thông Tin Nhiệm Vụ: **{t['title']}**\n\n"
                reply += f"- **Trạng thái:** `{t['status']}`\n"
                reply += f"- **Độ ưu tiên:** `{t['priority']}`\n"
                reply += f"- **Người thực hiện:** `{t.get('assignee', 'Chưa phân công')}`\n"
                reply += f"- **Ước tính:** `{t['estimated_hours']}h`\n"
                reply += f"- **Hạn chót:** `{t.get('due_date', 'Không có')}`\n"
                return reply
            else:
                reply = f"### 📌 Thống Kê Nhiệm Vụ Dự Án (**{context.get('project_name', 'Dự án')}**)\n\n"
                reply += f"Tổng số nhiệm vụ: **{context.get('total_tasks', 0)}**\n"
                reply += f"- Completed: `{context.get('completed_tasks', 0)}` | In Progress: `{context.get('in_progress_tasks', 0)}` | Todo: `{context.get('todo_tasks', 0)}`\n\n"
                reply += "👉 Hãy nhập tên chính xác của nhiệm vụ bạn muốn tra cứu."
                return reply

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
            return reply

        elif any(kw in msg_lower for kw in ["gợi ý", "phân công task", "assign"]):
            reply = f"### 🤖 Gợi Ý Phân Công Nhiệm Vụ Tự Động\n\n"
            reply += "Thuật toán AI G9 đánh giá khả năng nhận việc dựa trên **60% Skill Match** + **40% Workload Capacity**.\n\n"
            reply += "Các bước phân công tối ưu:\n"
            reply += "1. Truy cập tab **AI Hub -> 3. Gợi Ý Phân Công Nhiệm Vụ**\n"
            reply += "2. Nhập tiêu đề Task và các Kỹ năng bắt buộc (ví dụ: `Python, FastAPI, React`)\n"
            reply += "3. AI sẽ tự động chấm điểm và đề xuất ứng viên tốt nhất kèm lý do chi tiết.\n"
            return reply

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
            return reply


class AIChatService:
    def __init__(self):
        self.llm_provider = LLMProvider()
        self.rule_provider = RuleBasedProvider()

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

        # Upcoming tasks with due_dates sorted
        tasks_with_due = [t for t in tasks if t.due_date]
        tasks_with_due.sort(key=lambda x: x.due_date)
        upcoming_tasks = [
            {
                "title": t.title,
                "due_date": t.due_date.strftime("%Y-%m-%d %H:%M"),
                "status": t.status,
                "priority": t.priority
            }
            for t in tasks_with_due[:5]
        ]

        all_task_summaries = []
        for t in tasks:
            is_overdue = bool(t.due_date and t.due_date < now and t.status != "Done")
            days_overdue = (now - t.due_date).days if is_overdue else 0
            assignee_name = user_dict.get(t.assignee_id, "Chưa phân công")
            all_task_summaries.append({
                "id": t.id,
                "task_id": t.id,
                "title": t.title,
                "task_name": t.title,
                "status": t.status,
                "priority": t.priority,
                "assignee": assignee_name,
                "assignee_name": assignee_name,
                "estimated_hours": t.estimated_hours or 0.0,
                "due_date": t.due_date.strftime("%Y-%m-%d %H:%M") if t.due_date else "Không có",
                "is_overdue": is_overdue,
                "days_overdue": days_overdue
            })

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
            "upcoming_meetings": upcoming_meetings,
            "upcoming_tasks": upcoming_tasks,
            "all_task_summaries": all_task_summaries
        }

    def generate_chat_response(
        self, 
        db: Session, 
        project_id: Optional[int], 
        message: str, 
        history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        context = self.get_project_context(db, project_id)

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

            # Inject full JSON representation of tasks (Requirement 2)
            tasks_json = json.dumps(context["all_task_summaries"], ensure_ascii=False, indent=2)
            context_str += f"\nDANH SÁCH TASKS CHI TIẾT DỰ ÁN (JSON PAYLOAD):\n{tasks_json}\n"


        reply = None
        source = "llm"

        try:
            reply = self.llm_provider.generate(
                system_prompt=SYSTEM_PERSONA_PROMPT,
                context_str=context_str,
                message=message,
                history=history,
                context_data=context
            )
        except Exception as e:
            print(f"[AI Copilot Fallback] LLMProvider error/unavailable ({e}). Fallback -> RuleBasedProvider")
            reply = self.rule_provider.generate(
                system_prompt=SYSTEM_PERSONA_PROMPT,
                context_str=context_str,
                message=message,
                history=history,
                context_data=context
            )
            source = "rule_based"

        suggested_actions = [
            "Tóm tắt tiến độ tuần này",
            "Ai đang quá tải công việc?",
            "Các cuộc họp sắp tới",
            "Gợi ý phân công task X"
        ]

        return {
            "reply": reply,
            "suggested_actions": suggested_actions,
            "source": source,
            "context_used": {
                "project_name": context.get("project_name"),
                "total_tasks": context.get("total_tasks"),
                "overdue_tasks": context.get("overdue_tasks_count")
            }
        }

ai_chat_service = AIChatService()
