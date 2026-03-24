import uuid
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from app.dependencies import DB, CurrentUser, AdminUser
from app.models.organization import Organization
from app.schemas.organization import OrganizationOut, OrganizationUpdate

router = APIRouter(prefix="/v1/organizations", tags=["organizations"])


@router.get("/me", response_model=OrganizationOut)
async def get_my_org(current_user: CurrentUser, db: DB):
    result = await db.execute(select(Organization).where(Organization.id == current_user.organization_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrganizationOut.model_validate(org)


@router.put("/me", response_model=OrganizationOut)
async def update_my_org(data: OrganizationUpdate, current_user: AdminUser, db: DB):
    result = await db.execute(select(Organization).where(Organization.id == current_user.organization_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(org, field, value)
    return OrganizationOut.model_validate(org)
