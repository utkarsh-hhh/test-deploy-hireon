from datetime import datetime
from pydantic import BaseModel
from app.schemas.base import OrmSchema


class OrganizationOut(OrmSchema):
    id: str
    name: str
    slug: str
    logo_url: str | None = None
    website: str | None = None
    industry: str | None = None
    size: str | None = None
    description: str | None = None
    is_active: bool
    created_at: datetime


class OrganizationUpdate(BaseModel):
    name: str | None = None
    website: str | None = None
    industry: str | None = None
    size: str | None = None
    description: str | None = None
