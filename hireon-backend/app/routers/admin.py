"""
Admin-only endpoints: audit logs, org settings, team management.
"""
import uuid
from fastapi import APIRouter, Query
from sqlalchemy import select, func
from app.dependencies import DB, AdminUser
from app.models.audit_log import AuditLog
from app.models.user import User
from app.utils.pagination import paginate

router = APIRouter(prefix="/v1/admin", tags=["admin"])


@router.get("/audit-logs")
async def list_audit_logs(
    current_user: AdminUser,
    db: DB,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    action: str | None = None,
    resource_type: str | None = None,
):
    query = select(AuditLog).where(AuditLog.organization_id == current_user.organization_id)
    if action:
        query = query.where(AuditLog.action == action.upper())
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    query = query.order_by(AuditLog.created_at.desc())

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    items = (await db.execute(query.offset((page - 1) * limit).limit(limit))).scalars().all()

    # Batch-fetch user names to avoid N+1 queries
    user_ids = list({log.user_id for log in items if log.user_id})
    users_map: dict = {}
    if user_ids:
        users_res = await db.execute(select(User.id, User.full_name).where(User.id.in_(user_ids)))
        users_map = {str(r[0]): r[1] for r in users_res.all()}

    return paginate([
        {
            "id": str(log.id),
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "user_id": str(log.user_id) if log.user_id else None,
            "user_name": users_map.get(str(log.user_id)) if log.user_id else None,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat(),
        }
        for log in items
    ], total, page, limit)


@router.get("/stats")
async def org_stats(current_user: AdminUser, db: DB):
    """Admin dashboard stats."""
    total_users = (await db.execute(
        select(func.count(User.id)).where(User.organization_id == current_user.organization_id)
    )).scalar()
    active_users = (await db.execute(
        select(func.count(User.id)).where(
            User.organization_id == current_user.organization_id,
            User.is_active == True,
        )
    )).scalar()
    return {"total_users": total_users, "active_users": active_users}
