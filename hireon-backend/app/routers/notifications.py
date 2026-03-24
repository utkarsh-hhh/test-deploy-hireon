import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from jose import JWTError
from sqlalchemy import select
from app.dependencies import DB, CurrentUser
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut
from app.utils.security import decode_access_token
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/v1/notifications", tags=["notifications"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint for real-time notifications.
    Connect: ws://localhost:8000/v1/notifications/ws?token=ACCESS_TOKEN
    """
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await ws_manager.connect(websocket, user_id)
    # Send a welcome message
    await ws_manager.send_to_user(user_id, "connected", {"message": "Connected to HireOn notifications"})

    try:
        while True:
            # Keep connection alive; handle ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)


@router.get("", response_model=list[NotificationOut])
async def list_notifications(current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return [NotificationOut.model_validate(n) for n in result.scalars().all()]


@router.get("/unread-count")
async def unread_count(current_user: CurrentUser, db: DB):
    from sqlalchemy import func
    count = (await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )).scalar()
    return {"count": count}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: uuid.UUID, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    return {"message": "Marked as read"}


@router.post("/read-all")
async def mark_all_read(current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )
    for notif in result.scalars().all():
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
    return {"message": "All notifications marked as read"}
