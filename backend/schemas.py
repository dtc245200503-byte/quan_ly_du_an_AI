from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
import datetime

# User & Auth Schemas
class UserRegister(BaseModel):
    identifier: str # Can be email or phone number
    password: str
    full_name: str
    role: Optional[str] = "Member"

class QuickUserCreate(BaseModel):
    full_name: str
    project_id: Optional[int] = None

class UserLogin(BaseModel):
    identifier: str # Can be email or phone number
    password: str

class ForgotPasswordRequest(BaseModel):
    identifier: str
    method: Optional[str] = "email" # email or sms

class ResetPasswordRequest(BaseModel):
    identifier: str
    token_or_otp: str
    new_password: str

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

class WeeklySummaryResponse(BaseModel):
    project_id: int
    summary: str
    completed_tasks_count: int
    pending_tasks_count: int
    overdue_tasks_count: int
    risks: List[str]
    priorities: List[str]

class MeetingMinutesRequest(BaseModel):
    project_id: int
    title: str
    raw_notes: str

class MeetingMinutesResponse(BaseModel):
    note_id: int
    project_id: int
    title: str
    ai_summary: str
    action_items: List[str]

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

class SuggestAssignmentResponse(BaseModel):
    project_id: int
    task_title: str
    required_skills: List[str]
    suggested_assignee: CandidateSuggestion
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
    title: str
    ai_risk_score: float
    status: str
    due_date: Optional[datetime.datetime] = None


class RiskAnalysisResponse(BaseModel):
    project_id: int
    analyzed_tasks_count: int
    high_risk_tasks: List[RiskTaskSummary]
    message: str


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



