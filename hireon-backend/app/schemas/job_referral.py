from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.schemas.base import OrmSchema

class JobReferralOut(OrmSchema):
    id: str
    job_id: str
    referrer_id: str
    referee_first_name: str
    referee_last_name: str
    referee_email: str
    referee_phone: str | None = None
    relationship: str | None = None
    reason: str | None = None
    created_at: datetime

class JobReferralCreate(BaseModel):
    referee_first_name: str
    referee_last_name: str
    referee_email: EmailStr
    referee_phone: str | None = None
    relationship: str | None = None
    reason: str | None = None
