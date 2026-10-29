from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from pydantic.networks import validate_email
from typing import Optional, List
import datetime
from backend.phone import normalize_phone

# User & Auth Schemas
class AuthEmail(BaseModel):
    identifier: str

    @field_validator("identifier")
    @classmethod
    def validate_email(cls, value):
        value = value.strip().lower()
        return validate_email(value)[1]


def validate_auth_password(value):
    if len(value) < 8 or len(value.encode("utf-8")) > 72:
        raise ValueError("Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte")
    return value


class UserRegister(BaseModel):
    identifier: str  # Login email or phone; email below is required for phone signup.
    email: Optional[str] = None
    password: str
    full_name: str
    role: Optional[str] = "Member"

    _password = field_validator("password")(validate_auth_password)

    @field_validator("identifier")
    @classmethod
    def validate_identifier(cls, value):
        value = value.strip()
        if "@" in value:
            return validate_email(value.lower())[1]
        return normalize_phone(value)

    @field_validator("email")
    @classmethod
    def validate_delivery_email(cls, value):
        return validate_email(value.strip().lower())[1] if value is not None else None

    @model_validator(mode="after")
    def require_delivery_email(self):
        if "@" in self.identifier:
            if self.email is not None and self.email != self.identifier:
                raise ValueError("Email nhận OTP phải khớp email đăng ký")
            self.email = self.identifier
        elif not self.email:
            raise ValueError("Đăng ký bằng số điện thoại cần email để nhận OTP")
        return self

    @property
    def phone_number(self):
        return None if "@" in self.identifier else self.identifier

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value):
        if not value.strip() or len(value) > 150:
            raise ValueError("Họ tên phải từ 1 đến 150 ký tự")
        return value.strip()

    @field_validator("role")
    @classmethod
    def validate_role(cls, value):
        if value not in (None, "Member", "PM"):
            raise ValueError("Không thể tự đăng ký quyền quản trị viên")
        return value

class QuickUserCreate(BaseModel):
    full_name: str
    project_id: Optional[int] = None

class UserLogin(BaseModel):
    identifier: str # Can be email or phone number
    password: str

class ForgotPasswordRequest(AuthEmail):
    identifier: str
    method: Optional[str] = "email" # email or sms

class VerifyOtpRequest(AuthEmail):
    token_or_otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResetPasswordRequest(AuthEmail):
    identifier: str
    token_or_otp: str = Field(min_length=20, max_length=128)
    new_password: str
    confirm_password: str
    _password = field_validator("new_password")(validate_auth_password)

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    skills: Optional[List[str]] = None
    avatar_url: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    job_title: Optional[str] = None

class UserRoleUpdate(BaseModel):
    role: str

class UserResponse(BaseModel):
    id: int
    email: Optional[str] = None
    phone_number: Optional[str] = None
    full_name: str
    role: str
    skills: List[str] = []
    avatar_url: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    job_title: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Project Schemas
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class MemberAdd(BaseModel):
    user_id: int
    role: Optional[str] = "Member" # PM or Member

class MemberResponse(BaseModel):
    id: int
    project_id: int
    user_id: int
    role: str
    user: UserResponse
    joined_at: datetime.datetime

    class Config:
        from_attributes = True

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    owner_id: int
    owner: UserResponse
    members: List[MemberResponse] = []
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# Sprint Schemas
class SprintCreate(BaseModel):
    project_id: int
    name: str
    goal: Optional[str] = None
    start_date: Optional[datetime.datetime] = None
    end_date: Optional[datetime.datetime] = None

class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    status: Optional[str] = None # Planning, Active, Completed
    start_date: Optional[datetime.datetime] = None
    end_date: Optional[datetime.datetime] = None

class SprintResponse(BaseModel):
    id: int
    project_id: int
    name: str
    goal: Optional[str] = None
    status: str
    start_date: Optional[datetime.datetime] = None
    end_date: Optional[datetime.datetime] = None
    task_count: Optional[int] = 0

    class Config:
        from_attributes = True


# Task Comment & Attachment Schemas
class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    user: UserResponse
    content: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class AttachmentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    file_name: str
    file_path: str
    file_size: int
    uploaded_at: datetime.datetime

    class Config:
        from_attributes = True


# Task Schemas
class TaskCreate(BaseModel):
    project_id: int
    sprint_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: Optional[str] = "Todo"
    priority: Optional[str] = "Medium"
    assignee_id: Optional[int] = None
    due_date: Optional[datetime.datetime] = None
    estimated_hours: Optional[float] = 0.0

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
    sprint_id: Optional[int] = None
    due_date: Optional[datetime.datetime] = None
    estimated_hours: Optional[float] = None

class TaskResponse(BaseModel):
    id: int
    project_id: int
    sprint_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    assignee_id: Optional[int] = None
    assignee: Optional[UserResponse] = None
    reporter_id: Optional[int] = None
    reporter: Optional[UserResponse] = None
    due_date: Optional[datetime.datetime] = None
    estimated_hours: float
    ai_risk_score: Optional[float] = 0.0
    comments: List[CommentResponse] = []
    attachments: List[AttachmentResponse] = []
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True



# AI Schemas
class WeeklySummaryRequest(BaseModel):
    project_id: int

class RiskDetailItem(BaseModel):
    task_id: int
    task_code: str
    title: str
    days_overdue: int
    assignee: str
    recommendation: str

class WeeklySummaryResponse(BaseModel):
    project_id: int
    summary: str
    completed_tasks_count: int
    pending_tasks_count: int
    overdue_tasks_count: int
    risks: List[str]
    priorities: List[str]
    health_status: Optional[str] = "AN TOÀN / TRONG TẦM KIỂM SOÁT"
    health_level: Optional[str] = "SAFE"
    overdue_rate: Optional[float] = 0.0
    risk_details: Optional[List[RiskDetailItem]] = []

class MeetingMinutesRequest(BaseModel):
    project_id: int
    title: str
    raw_notes: str

class MeetingActionItem(BaseModel):
    stt: int
    title: str
    assignee: str
    due_date: str

class MeetingMinutesResponse(BaseModel):
    note_id: int
    project_id: int
    title: str
    ai_summary: str
    action_items: List[str]
    document_markdown: Optional[str] = None
    attendees: Optional[List[str]] = []
    action_items_detailed: Optional[List[MeetingActionItem]] = []

class SuggestAssignmentRequest(BaseModel):
    project_id: int
    task_title: str
    required_skills: List[str]

class CandidateSuggestion(BaseModel):
    user_id: int
    full_name: str
    job_title: Optional[str] = None
    skills: List[str]
    skill_match_score: float
    current_workload_hours: float
    final_score: float
    reason: str
    skill_fit: Optional[float] = 0.0
    availability: Optional[float] = 0.0
    workload_risk: Optional[str] = "Thấp"

class SuggestAssignmentResponse(BaseModel):
    project_id: int
    task_title: str
    required_skills: List[str]
    suggested_assignee: Optional[CandidateSuggestion] = None
    all_candidates: List[CandidateSuggestion]


# Online Meeting Schemas
class MeetingCreate(BaseModel):
    project_id: int
    title: str
    platform: Optional[str] = "Google Meet"
    meeting_link: str
    start_time: datetime.datetime
    participants: Optional[List[int]] = [] # list of user_ids

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    platform: Optional[str] = None
    meeting_link: Optional[str] = None
    start_time: Optional[datetime.datetime] = None
    participants: Optional[List[int]] = None

class MeetingResponse(BaseModel):
    id: int
    project_id: int
    title: str
    platform: str
    meeting_link: str
    start_time: datetime.datetime
    created_by: int
    creator: Optional[UserResponse] = None
    participants: List[int] = []
    participant_users: List[UserResponse] = []
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# AI Copilot Chat Schemas
class AIChatMessage(BaseModel):
    role: str # "user" or "assistant" or "system"
    content: str

class AIChatRequest(BaseModel):
    project_id: Optional[int] = None
    message: str
    history: Optional[List[AIChatMessage]] = []

class AIChatResponse(BaseModel):
    reply: str
    suggested_actions: Optional[List[str]] = []
    context_used: Optional[dict] = None
    source: Optional[str] = "llm"


class ChatMessageResponse(BaseModel):
    id: int
    project_id: Optional[int] = None
    user_id: int
    role: str
    content: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class AIReportResponse(BaseModel):
    id: int
    project_id: int
    report_type: str
    content: str
    generated_at: datetime.datetime

    class Config:
        from_attributes = True


class RiskTaskSummary(BaseModel):
    id: int
    task_code: Optional[str] = None
    title: str
    ai_risk_score: float
    status: str
    due_date: Optional[datetime.datetime] = None
    assignee: Optional[str] = None
    risk_category: Optional[str] = "Schedule Risk"
    root_cause: Optional[str] = None
    mitigation_plan: Optional[str] = None


class RiskAnalysisResponse(BaseModel):
    project_id: int
    analyzed_tasks_count: int
    high_risk_tasks: List[RiskTaskSummary]
    message: str
    schedule_risk_count: Optional[int] = 0
    resource_risk_count: Optional[int] = 0
    qa_risk_count: Optional[int] = 0
    matrix_markdown: Optional[str] = None


class AIFeedbackCreate(BaseModel):
    feature: str # "chat", "suggest_assignment", "weekly_summary"
    rating: str # "up", "down"
    note: Optional[str] = None


class AIFeedbackResponse(BaseModel):
    id: int
    user_id: int
    feature: str
    rating: str
    note: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True



