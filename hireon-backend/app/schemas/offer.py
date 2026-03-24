from datetime import datetime
from pydantic import BaseModel
from app.utils.permissions import OfferStatus
from app.schemas.base import OrmSchema


class OfferCreate(BaseModel):
    application_id: str
    position_title: str
    base_salary: float
    salary_currency: str = "USD"
    bonus: float | None = None
    equity: str | None = None
    benefits: str | None = None
    start_date: datetime | None = None
    expiry_date: datetime | None = None
    letter_content: str | None = None


class OfferUpdate(BaseModel):
    position_title: str | None = None
    base_salary: float | None = None
    salary_currency: str | None = None
    bonus: float | None = None
    equity: str | None = None
    benefits: str | None = None
    start_date: datetime | None = None
    expiry_date: datetime | None = None
    letter_content: str | None = None


class OfferOut(OrmSchema):
    id: str
    organization_id: str
    application_id: str
    status: OfferStatus
    base_salary: float
    salary_currency: str
    bonus: float | None = None
    equity: str | None = None
    benefits: str | None = None
    position_title: str
    start_date: datetime | None = None
    expiry_date: datetime | None = None
    letter_content: str | None = None
    pdf_url: str | None = None
    sent_at: datetime | None = None
    responded_at: datetime | None = None
    decline_reason: str | None = None
    created_at: datetime
    updated_at: datetime


class OfferRespondRequest(BaseModel):
    accept: bool
    decline_reason: str | None = None
