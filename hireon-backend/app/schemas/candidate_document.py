from datetime import datetime
from pydantic import BaseModel
from app.schemas.base import OrmSchema

class CandidateDocumentOut(OrmSchema):
    id: str
    candidate_id: str
    doc_type: str
    file_url: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

class CandidateDocumentCreate(BaseModel):
    doc_type: str
    file_url: str | None = None
    status: str | None = "pending"
