from fastapi import APIRouter, Query
from sqlalchemy import select, desc
from app.dependencies import DB, CurrentUser
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/v1/activities", tags=["activities"])

# Only HR-relevant resource types shown on HR dashboard
HR_RESOURCE_TYPES = {"job", "candidate", "interview", "offer", "application"}

@router.get("")
async def list_activities(
    current_user: CurrentUser,
    db: DB,
    limit: int = Query(20, gt=0, le=100)
):
    """Recent HR-related activities for the organisation (excludes admin/auth events)."""
    result = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.organization_id == current_user.organization_id,
            AuditLog.resource_type.in_(HR_RESOURCE_TYPES),
        )
        .order_by(desc(AuditLog.created_at))
        .limit(limit)
    )
    activities = result.scalars().all()

    return [
        {
            "id": str(a.id),
            "action": a.action,
            "resource_type": a.resource_type,
            "resource_id": a.resource_id,
            "details": a.details,
            "created_at": a.created_at.isoformat(),
            "user_id": str(a.user_id) if a.user_id else None,
        }
        for a in activities
    ]
