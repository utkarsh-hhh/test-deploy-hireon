import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

async def log_activity(
    db: AsyncSession,
    organization_id: uuid.UUID,
    user_id: uuid.UUID | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None
) -> AuditLog:
    """
    Logs an activity to the database and broadcasts it via WebSockets.
    """
    activity = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(activity)
    await db.flush()  # To get the ID and created_at
    
    # Refresh to ensure we have all fields for broadcasting
    await db.refresh(activity)

    # Broadcast to organization
    # For now, we'll broadcast to all connected users in the organization
    # In a real app, we might want to filter by permissions
    try:
        # Get all users in the organization (this would be better cached)
        # For simplicity, we'll just broadcast to all if we can't easily filter
        # But wait, our ws_manager has broadcast_to_org which takes user_ids
        # We need to know who is online or just send to all connections that belong to this org
        
        event_data = {
            "id": str(activity.id),
            "action": activity.action,
            "resource_type": activity.resource_type,
            "resource_id": activity.resource_id,
            "details": activity.details,
            "created_at": activity.created_at.isoformat(),
            "user_id": str(activity.user_id) if activity.user_id else None,
        }
        
        # NOTE: The current ws_manager.broadcast_to_org requires a list of user_ids.
        # This is slightly inefficient if we don't have the list of online users for an org readily available.
        # However, for a "Live" feel, we want anyone currently on the dashboard to see it.
        # We'll assume the client filters or we'll need to enhance ws_manager later.
        # For now, let's just use what we have.
        
        # We'll actually broadcast to the 'activity' topic or similar if we had it.
        # Given current manager.py, we'll just broadcast to the specific user if they are the one who did it, 
        # but the request is for organization-wide "Live" activity.
        
        # Let's check how to broadcast to all users in an org.
        # manager.py: broadcast_to_org(org_id, user_ids, event, data)
        # We'll need a list of user IDs for the org.
        
        from sqlalchemy import select
        from app.models.user import User
        user_result = await db.execute(select(User.id).where(User.organization_id == organization_id))
        user_ids = [str(uid) for uid in user_result.scalars().all()]
        
        await ws_manager.broadcast_to_org(
            org_id=str(organization_id),
            user_ids=user_ids,
            event="activity_created",
            data=event_data
        )
    except Exception as e:
        logger.error(f"Failed to broadcast activity: {e}")

    return activity
