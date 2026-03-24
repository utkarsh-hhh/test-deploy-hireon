from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid

class InvitationCreate(BaseModel):
    email: EmailStr
    full_name: str
    candidate_id: uuid.UUID | None = None

class InvitationOut(BaseModel):
    id: uuid.UUID
    email: str
    token: str
    expires_at: datetime
    full_name: str | None = None
    is_used: bool
    created_at: datetime

    class Config:
        from_attributes = True

class InvitationVerify(BaseModel):
    token: str
    email: str
    full_name: str

class InvitationUse(BaseModel):
    password: str
