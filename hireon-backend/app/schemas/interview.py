from datetime import datetime
from pydantic import BaseModel
from app.utils.permissions import InterviewType, InterviewStatus
from app.schemas.base import OrmSchema


class PanelistIn(BaseModel):
    user_id: str
    role: str | None = None


class InterviewCreate(BaseModel):
    candidate_id: str                          # direct candidate — no application needed
    application_id: str | None = None          # optional legacy field
    title: str
    interview_type: InterviewType = InterviewType.VIDEO
    scheduled_at: datetime
    duration_minutes: int = 60
    meeting_link: str | None = None
    location: str | None = None
    notes: str | None = None
    is_confirmed: bool = False
    panelist_ids: list[PanelistIn] = []


class InterviewUpdate(BaseModel):
    title: str | None = None
    interview_type: InterviewType | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None
    location: str | None = None
    meeting_link: str | None = None
    notes: str | None = None
    status: InterviewStatus | None = None
    feedback: str | None = None
    is_confirmed: bool | None = None


class PanelistOut(OrmSchema):
    id: str
    user_id: str
    role: str | None = None
    user_name: str | None = None
    user_email: str | None = None


class InterviewOut(OrmSchema):
    id: str
    organization_id: str
    candidate_id: str
    application_id: str | None = None         # optional
    title: str
    interview_type: InterviewType
    status: InterviewStatus
    scheduled_at: datetime
    duration_minutes: int
    meeting_link: str | None = None
    location: str | None = None
    notes: str | None = None
    feedback: str | None = None
    is_confirmed: bool
    candidate_skills: list[str] = []
    panelists: list[PanelistOut] = []
    created_at: datetime
    updated_at: datetime
