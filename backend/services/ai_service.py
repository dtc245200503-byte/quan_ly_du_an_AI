import json
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models import Project, Task, User, ProjectMember, MeetingNote, AIReport, AIFeedback

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
        total_tasks_count = len(tasks)
        completion_rate = round((len(completed) / total_tasks_count * 100), 1) if total_tasks_count > 0 else 0.0
        overdue_rate = round((len(overdue) / total_tasks_count * 100), 1) if total_tasks_count > 0 else 0.0

        # Đánh giá sức khỏe dự án linh hoạt theo tỷ lệ trễ hạn > 20%
        if overdue_rate > 20.0 or (completion_rate == 0.0 and len(overdue) > 0):
            health_status = "CẢNH BÁO CẤP ĐỘ 1 (RỦI RO TIẾN ĐỘ SEVERE)"
            health_level = "SEVERE"
            health_reason = (
                f"Dự án hiện có {len(overdue)}/{total_tasks_count} nhiệm vụ bị quá hạn hoàn thành, "
                f"tỷ lệ trễ hạn đạt {overdue_rate}% (vượt ngưỡng cho phép > 20%). Dự án đang gặp nút thắt tiến độ nghiêm trọng!"
            )
        else:
            health_status = "AN TOÀN / TRONG TẦM KIỂM SOÁT"
            health_level = "SAFE"
            health_reason = (
                f"Tiến độ dự án đang được kiểm soát hiệu quả. "
                f"Tỷ lệ trễ hạn ở mức {overdue_rate}% (nằm trong biên độ an toàn <= 20%)."
            )

        # Tạo văn phong nhận xét quản trị dự án chuyên nghiệp
        summary_text = (
            f"# BÁO CÁO GIÁM SÁT TIẾN ĐỘ VÀ ĐIỀU HÀNH DỰ ÁN\n\n"
            f"**Tên dự án:** {project.name}\n"
            f"**TÌNH TRẠNG SỨC KHỎE DỰ ÁN:** {health_status}\n"
            f"**Phân tích tổng quan:** Dự án hiện đạt {completion_rate}% khối lượng công việc ({len(completed)}/{total_tasks_count} nhiệm vụ), "
            f"tuy nhiên {health_reason.lower()}\n\n"
            f"**Chỉ số thực thi:**\n"
            f"- Đã hoàn thành: {len(completed)} tasks ({completion_rate}%)\n"
            f"- Tồn đọng (Pending): {len(pending)} tasks\n"
            f"- Quá hạn (Overdue): {len(overdue)} tasks ({overdue_rate}%)\n"
            f"- Định mức thời gian: {done_hours}/{total_hours} giờ làm việc"
        )

        # Chi tiết rủi ro kèm Mã Task [TASK-XX], số ngày trễ hạn, nhân sự phụ trách và khuyến nghị hành chính
        risk_details = []
        risks = []
        for task in overdue:
            days_overdue = (now - task.due_date).days if task.due_date else 1
            days_overdue = max(1, days_overdue)
            assignee_name = task.assignee.full_name if task.assignee else "Chưa phân công"
            task_code = f"[TASK-{task.id:02d}]"
            recommendation = f"Đề xuất họp khẩn đôn đốc nhân sự {assignee_name} gia tăng nguồn lực giải quyết dứt điểm nhiệm vụ {task_code}."

            risk_details.append({
                "task_id": task.id,
                "task_code": task_code,
                "title": task.title,
                "days_overdue": days_overdue,
                "assignee": assignee_name,
                "recommendation": recommendation
            })
            risks.append(f"{task_code} '{task.title}' - Trễ {days_overdue} ngày (Phụ trách: {assignee_name}). {recommendation}")

        if not risks:
            risks.append("Không phát hiện rủi ro trễ hạn lớn. Toàn bộ nhiệm vụ diễn ra đúng tiến độ cam kết.")

        priorities = []
        if overdue:
            priorities.append(f"Tập trung ưu tiên giải quyết nút thắt tại task quá hạn [TASK-{overdue[0].id:02d}] '{overdue[0].title}'")
        priorities.append("Đôn đốc các nhiệm vụ đang ở trạng thái InProgress & Review hoàn thành đúng mốc thời gian")
        priorities.append("Tổ chức phiên họp giao ban điều hành giữa tuần để rà soát danh mục rủi ro kỹ thuật")

        # Lưu bản ghi báo cáo vào bảng AIReport (Phase 3)
        report = AIReport(
            project_id=project_id,
            report_type="Weekly",
            content=summary_text
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        return {
            "project_id": project.id,
            "summary": summary_text,
            "completed_tasks_count": len(completed),
            "pending_tasks_count": len(pending),
            "overdue_tasks_count": len(overdue),
            "risks": risks,
            "priorities": priorities,
            "health_status": health_status,
            "health_level": health_level,
            "overdue_rate": overdue_rate,
            "risk_details": risk_details,
            "report_id": report.id
        }

    def get_ai_reports(self, db: Session, project_id: int) -> List[AIReport]:
        """Lấy danh sách các báo cáo AI đã sinh ra của dự án (Phase 3)"""
        return db.query(AIReport).filter(AIReport.project_id == project_id).order_by(AIReport.generated_at.desc()).all()

    def generate_meeting_minutes(self, db: Session, project_id: int, user_id: int, title: str, raw_notes: str) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Không tìm thấy dự án")

        creator = db.query(User).filter(User.id == user_id).first()
        creator_name = creator.full_name if creator else "Trưởng dự án"
        creator_role = creator.job_title if (creator and creator.job_title) else "Quản lý Dự án (PM)"

        # Trích xuất danh sách nhân sự thực tế từ CSDL dự án (ProjectMember & User)
        member_records = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
        member_users = []
        for m in member_records:
            if m.user:
                member_users.append(m.user)
        if not member_users and creator:
            member_users = [creator]

        attendees_names = [u.full_name for u in member_users]
        if creator and creator.full_name not in attendees_names:
            attendees_names.insert(0, creator.full_name)

        # Xử lý trích xuất Action Items từ ghi chú thô
        lines = [line.strip() for line in raw_notes.split("\n") if line.strip()]
        action_items_detailed = []
        action_items_str_list = []
        summary_paragraphs = []

        now = datetime.datetime.now()
        stt = 1
        for line in lines:
            if line.startswith("-") or line.startswith("*") or any(k in line.lower() for k in ["cần", "phải", "giao", "hoàn thành", "triển khai", "phụ trách"]):
                clean_item = line.lstrip("-*1234567890. ").strip()

                # Tìm nhân sự khớp tên trong CSDL hoặc phân công xoay vòng
                assigned_user = member_users[(stt - 1) % len(member_users)]
                for u in member_users:
                    if u.full_name.lower() in line.lower():
                        assigned_user = u
                        break

                due_date_str = (now + datetime.timedelta(days=3)).strftime("%d/%m/%Y")
                action_items_detailed.append({
                    "stt": stt,
                    "title": clean_item,
                    "assignee": assigned_user.full_name,
                    "due_date": due_date_str
                })
                action_items_str_list.append(f"[{stt}] {clean_item} — Phụ trách: {assigned_user.full_name} (Hạn: {due_date_str})")
                stt += 1
            else:
                summary_paragraphs.append(line)

        if not action_items_detailed:
            default_assignee = member_users[0].full_name if member_users else creator_name
            due_date_str = (now + datetime.timedelta(days=3)).strftime("%d/%m/%Y")
            action_items_detailed = [
                {"stt": 1, "title": "Cập nhật tiến độ nhiệm vụ chi tiết lên bảng Kanban", "assignee": default_assignee, "due_date": due_date_str},
                {"stt": 2, "title": "Rà soát mã nguồn & chuẩn bị tài liệu kiểm thử cho Sprint", "assignee": default_assignee, "due_date": due_date_str}
            ]
            action_items_str_list = [
                f"[1] Cập nhật tiến độ nhiệm vụ chi tiết lên bảng Kanban — Phụ trách: {default_assignee} (Hạn: {due_date_str})",
                f"[2] Rà soát mã nguồn & chuẩn bị tài liệu kiểm thử cho Sprint — Phụ trách: {default_assignee} (Hạn: {due_date_str})"
            ]

        # Chuẩn hóa Thể thức văn bản hành chính Nhà nước (Nghị định 30/2020/NĐ-CP)
        date_str = now.strftime("Ngày %d tháng %m năm %Y")
        attendees_str = ", ".join(attendees_names)
        action_table_rows = "\n".join([
            f"| {item['stt']} | {item['title']} | **{item['assignee']}** | {item['due_date']} |"
            for item in action_items_detailed
        ])

        discussion_body = "\n\n".join(summary_paragraphs) if summary_paragraphs else raw_notes

        document_markdown = f"""**CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM**  
**Độc lập - Tự do - Hạnh phúc**  
***

**DỰ ÁN: {project.name.upper()}** — Số: {now.strftime('%d%m')}/BB-G9 — *{date_str}*

# BIÊN BẢN CUỘC HỌP
**(V/v: {title})**

---

### I. THỜI GIAN & ĐỊA ĐIỂM
- **Thời gian:** {now.strftime('%H:%M - %d/%m/%Y')}
- **Địa điểm:** Phòng họp trực tuyến G9 / Hệ thống Quản lý Dự án

### II. THÀNH PHẦN THAM DỰ
- **Chủ trì:** {creator_name} ({creator_role})
- **Thư ký:** Trợ lý AI G9 (Hệ thống AI tự động)
- **Thành viên tham gia:** {attendees_str} (Trích xuất dữ liệu thành viên từ CSDL dự án)

### III. NỘI DUNG THẢO LUẬN & ĐÁNH GIÁ TIẾN ĐỘ
{discussion_body}

### IV. KẾT LUẬN VÀ GIAO NHIỆM VỤ (ACTION ITEMS)
| STT | Nội dung công việc | Người thực hiện | Thời hạn hoàn thành |
|:---:|---|---|:---:|
{action_table_rows}
"""

        ai_summary = f"Biên bản cuộc họp '{title}' dự án {project.name}. Đã thống nhất nội dung và phân công {len(action_items_detailed)} công việc cho các thành viên."

        note = MeetingNote(
            project_id=project_id,
            title=title,
            content=raw_notes,
            ai_summary=ai_summary,
            action_items=json.dumps(action_items_str_list, ensure_ascii=False),
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
            "action_items": action_items_str_list,
            "document_markdown": document_markdown,
            "attendees": attendees_names,
            "action_items_detailed": action_items_detailed
        }

    def suggest_assignment(self, db: Session, project_id: int, task_title: str, required_skills: List[str]) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Không tìm thấy dự án")

        member_records = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
        member_ids = [m.user_id for m in member_records]
        if not member_ids:
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

            # Chỉ số năng lực (Skill Fit Match Score: 0.0 - 100.0)
            if req_set:
                matches = req_set.intersection(user_skill_set)
                skill_match_score = round((len(matches) / len(req_set)) * 100, 1)
            else:
                matches = set()
                skill_match_score = 100.0

            # Định mức lao động & Khả dụng (Availability Score: 0.0 - 100.0)
            active_tasks = db.query(Task).filter(Task.assignee_id == u.id, Task.status != "Done").all()
            workload_hours = sum(t.estimated_hours for t in active_tasks)

            max_capacity = 40.0
            availability_score = max(0.0, round(((max_capacity - min(workload_hours, max_capacity)) / max_capacity) * 100, 1))

            # Mức độ rủi ro quá tải (Workload Risk Level)
            if workload_hours > 35.0:
                workload_risk = "Cao"
            elif workload_hours > 20.0:
                workload_risk = "Trung bình"
            else:
                workload_risk = "Thấp"

            # Điểm tổng hợp: 60% Skill Fit + 40% Availability
            final_score = round((0.6 * skill_match_score) + (0.4 * availability_score), 1)

            matched_skills_str = ", ".join([s.title() for s in matches]) if matches else "Kỹ năng nền tảng"

            # Mẫu câu giải trình chuyên nghiệp theo yêu cầu đề bài
            reason = (
                f"Ứng viên {u.full_name} đạt {final_score}/100 điểm đánh giá. "
                f"Về chuyên môn: Tương thích {skill_match_score}% với các kỹ năng yêu cầu ({matched_skills_str}); "
                f"Về định mức lao động: Khối lượng công việc tồn đọng {workload_hours} giờ (nằm trong biên độ an toàn {availability_score}%). "
                f"Đề xuất phân công chính thức."
            )

            candidates.append({
                "user_id": u.id,
                "full_name": u.full_name,
                "job_title": u.job_title or "Kỹ sư phần mềm",
                "skills": user_skills,
                "skill_match_score": skill_match_score,
                "current_workload_hours": workload_hours,
                "final_score": final_score,
                "reason": reason,
                "skill_fit": skill_match_score,
                "availability": availability_score,
                "workload_risk": workload_risk
            })

        # Sắp xếp xếp hạng ứng viên giảm dần theo điểm tổng hợp
        candidates.sort(key=lambda x: x["final_score"], reverse=True)
        best_candidate = candidates[0] if candidates else None

        return {
            "project_id": project_id,
            "task_title": task_title,
            "required_skills": required_skills,
            "suggested_assignee": best_candidate,
            "all_candidates": candidates
        }

    def calculate_risk_scores(self, db: Session, project_id: int) -> Dict[str, Any]:
        """
        Phase 4 & Technical Risk Assessment Matrix: Phân tích rủi ro kỹ thuật toàn bộ Task trong dự án.
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Không tìm thấy dự án")

        tasks = db.query(Task).filter(Task.project_id == project_id).all()
        now = datetime.datetime.utcnow()

        high_risk_tasks = []
        schedule_risk_count = 0
        resource_risk_count = 0
        qa_risk_count = 0

        for task in tasks:
            task_code = f"[TASK-{task.id:02d}]"
            assignee_name = task.assignee.full_name if task.assignee else "Chưa phân công"

            if task.status == "Done":
                task.ai_risk_score = 0.0
                continue

            # Phân loại rủi ro kỹ thuật (3 nhóm: Schedule Risk, Resource Allocation Risk, QA/QC Bottleneck)
            if task.due_date and task.due_date < now:
                task.ai_risk_score = 1.0
                risk_category = "Schedule Risk"
                schedule_risk_count += 1
                days = (now - task.due_date).days or 1
                root_cause = f"Nhiệm vụ {task_code} ở trạng thái {task.status} đã quá hạn {days} ngày nhưng chưa hoàn thành."
                mitigation_plan = f"Gia hạn 2 ngày, đôn đốc nhân sự {assignee_name} ưu tiên xử lý trước 17:00 hôm nay."

            elif task.due_date:
                hours_left = (task.due_date - now).total_seconds() / 3600.0
                if hours_left <= 0:
                    task.ai_risk_score = 1.0
                    risk_category = "Schedule Risk"
                    schedule_risk_count += 1
                    root_cause = f"Nhiệm vụ {task_code} hết hạn thời gian thực thi."
                    mitigation_plan = f"Cấp báo cho PM và đôn đốc {assignee_name} đẩy nhanh tiến độ."
                elif hours_left < task.estimated_hours:
                    task.ai_risk_score = min(0.95, round(0.7 + (task.estimated_hours - hours_left) / (task.estimated_hours + 1.0), 2))
                    risk_category = "Schedule Risk"
                    schedule_risk_count += 1
                    root_cause = f"Thời gian còn lại ({round(hours_left, 1)}h) ít hơn khối lượng công việc ước tính ({task.estimated_hours}h)."
                    mitigation_plan = f"San tải bớt sub-tasks hoặc điều động nhân sự hỗ trợ cho {assignee_name}."
                elif hours_left <= 48 and task.status == "Todo":
                    task.ai_risk_score = 0.75
                    risk_category = "QA/QC Bottleneck"
                    qa_risk_count += 1
                    root_cause = f"Nhiệm vụ ở trạng thái Todo còn dưới 48 giờ đến hạn chót nhưng chưa được bắt đầu thực hiện."
                    mitigation_plan = f"Yêu cầu {assignee_name} chuyển trạng thái sang InProgress ngay trong ca làm việc."
                else:
                    ratio = task.estimated_hours / (hours_left + 1.0)
                    task.ai_risk_score = max(0.1, min(0.65, round(ratio, 2)))
                    risk_category = "Resource Allocation Risk"
                    root_cause = "Tiến độ thực hiện bình thường, cần duy trì nhịp độ làm việc."
                    mitigation_plan = "Tiếp tục theo dõi tiến độ báo cáo hàng ngày."
            else:
                if task.estimated_hours >= 20 and task.status == "Todo":
                    task.ai_risk_score = 0.7
                    risk_category = "Resource Allocation Risk"
                    resource_risk_count += 1
                    root_cause = f"Khối lượng nhiệm vụ lớn ({task.estimated_hours}h) chưa gán mốc thời gian hoàn thành cụ thể."
                    mitigation_plan = "Thiết lập mốc due_date và phân bổ milestone rõ ràng."
                else:
                    task.ai_risk_score = 0.2
                    risk_category = "Resource Allocation Risk"
                    root_cause = "Tải công việc nhẹ."
                    mitigation_plan = "Duy trì thực hiện."

            if task.ai_risk_score >= 0.7:
                high_risk_tasks.append({
                    "id": task.id,
                    "task_code": task_code,
                    "title": task.title,
                    "ai_risk_score": task.ai_risk_score,
                    "status": task.status,
                    "due_date": task.due_date,
                    "assignee": assignee_name,
                    "risk_category": risk_category,
                    "root_cause": root_cause,
                    "mitigation_plan": mitigation_plan
                })

        db.commit()

        # Tổng hợp Ma trận thẩm định rủi ro kỹ thuật (Markdown)
        matrix_rows = "\n".join([
            f"| {t['task_code']} | {t['title']} | **{t['risk_category']}** | {Math_round_score(t['ai_risk_score'])}% | {t['root_cause']} | {t['mitigation_plan']} |"
            for t in high_risk_tasks
        ]) if high_risk_tasks else "| - | Không phát hiện task rủi ro cao | - | 0% | Toàn bộ nhiệm vụ an toàn | Duy trì kế hoạch hiện tại |"

        matrix_markdown = f"""# MA TRẬN THẨM ĐỊNH RỦI RO KỸ THUẬT (TECHNICAL RISK ASSESSMENT REPORT)
**Dự án:** {project.name} — *Ngày phân tích: {now.strftime('%d/%m/%Y %H:%M')}*

### THỐNG KÊ PHÂN LOẠI RỦI RO:
- 🔴 **Rủi ro Chậm tiến độ (Schedule Risk):** {schedule_risk_count} nhiệm vụ
- 🟡 **Rủi ro Phân bổ nguồn lực (Resource Allocation Risk):** {resource_risk_count} nhiệm vụ
- 🔵 **Rủi ro Tồn đọng Kiểm thử (QA/QC Bottleneck):** {qa_risk_count} nhiệm vụ

### MA TRẬN CHI TIẾT CÁC TASK RỦI RO CAO:
| Mã Task | Tên nhiệm vụ | Phân loại rủi ro | Chỉ số rủi ro | Phân tích nguyên nhân gốc rễ (Root Cause) | Phương án khắc phục (Mitigation Plan) |
|:---:|---|:---:|:---:|---|---|
{matrix_rows}
"""

        # Lưu bản ghi báo cáo vào bảng AIReport
        ai_report = AIReport(
            project_id=project_id,
            report_type="Risk_Analysis",
            content=matrix_markdown
        )
        db.add(ai_report)
        db.commit()

        return {
            "project_id": project_id,
            "analyzed_tasks_count": len(tasks),
            "high_risk_tasks": high_risk_tasks,
            "message": f"Đã phân tích ma trận thẩm định rủi ro cho {len(tasks)} nhiệm vụ. Phát hiện {len(high_risk_tasks)} nhiệm vụ có rủi ro cao.",
            "schedule_risk_count": schedule_risk_count,
            "resource_risk_count": resource_risk_count,
            "qa_risk_count": qa_risk_count,
            "matrix_markdown": matrix_markdown
        }

    def save_feedback(self, db: Session, user_id: int, feature: str, rating: str, note: Optional[str] = None) -> AIFeedback:
        """Phase 5: Tiếp nhận phản hồi đánh giá AI 👍/👎"""
        feedback = AIFeedback(
            user_id=user_id,
            feature=feature,
            rating=rating,
            note=note
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return feedback

def Math_round_score(val: float) -> int:
    return int(round(val * 100))

ai_service = AIService()
