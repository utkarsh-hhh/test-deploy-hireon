from datetime import datetime
from pydantic import BaseModel
from app.schemas.base import OrmSchema

class OtherOfferOut(OrmSchema):
    id: str
    candidate_id: str
    company_name: str
    role: str | None = None
    ctc: str | None = None
    validity_date: str | None = None
    created_at: datetime

class OtherOfferCreate(BaseModel):
    company_name: str
    role: str | None = None
    ctc: str | None = None
    validity_date: str | None = None
