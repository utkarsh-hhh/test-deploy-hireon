from datetime import datetime
from pydantic import BaseModel
from app.utils.permissions import ApplicationStage
from app.schemas.candidate import CandidateOut
from app.schemas.job import JobOut
from app.schemas.base import OrmSchema


class ApplicationOut(OrmSchema):
    id: str
    organization_id: str
    job_id: str
    candidate_id: str
    stage: ApplicationStage
    match_score: float | None = None
    recruiter_notes: str | None = None
    rejection_reason: str | None = None
    source: str | None = None
    applied_at: datetime
    stage_changed_at: datetime
    created_at: datetime
    candidate: CandidateOut | None = None
    job: JobOut | None = None



class ApplicationCreate(BaseModel):
    job_id: str
    candidate_id: str
    source: str | None = "manual"


class StageUpdate(BaseModel):
    stage: ApplicationStage
    rejection_reason: str | None = None


class NotesUpdate(BaseModel):
    recruiter_notes: str
