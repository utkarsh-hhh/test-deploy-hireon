from datetime import datetime
from pydantic import BaseModel
from app.schemas.base import OrmSchema


class NotificationOut(OrmSchema):
    id: str
    organization_id: str
    user_id: str
    type: str
    title: str
    message: str
    data: dict | None = None
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime


class NotificationCreate(BaseModel):
    user_id: str
    organization_id: str
    type: str
    title: str
    message: str
    data: dict | None = None
