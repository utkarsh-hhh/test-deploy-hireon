"""
WebSocket connection manager.
Maps user_id → list of active WebSocket connections.
Supports multiple browser tabs per user.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # user_id (str) → list of active WebSockets
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)
        logger.info(f"WS connected: user={user_id}, total_connections={self.total}")

    def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        if user_id in self._connections:
            self._connections[user_id] = [
                ws for ws in self._connections[user_id] if ws is not websocket
            ]
            if not self._connections[user_id]:
                del self._connections[user_id]
        logger.info(f"WS disconnected: user={user_id}, total_connections={self.total}")

    async def send_to_user(self, user_id: str, event: str, data: Any) -> None:
        """Push a JSON event to all WebSocket connections for a user."""
        if user_id not in self._connections:
            return

        message = json.dumps({
            "type": "event",
            "event": event,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        dead = []
        for ws in self._connections[user_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)

        # Remove dead connections
        for ws in dead:
            self._connections[user_id] = [
                c for c in self._connections[user_id] if c is not ws
            ]

    async def broadcast_to_org(self, org_id: str, user_ids: list[str], event: str, data: Any) -> None:
        """Push an event to multiple users (e.g. all recruiters in an org)."""
        for user_id in user_ids:
            await self.send_to_user(user_id, event, data)

    @property
    def total(self) -> int:
        return sum(len(v) for v in self._connections.values())

    def is_connected(self, user_id: str) -> bool:
        return user_id in self._connections and bool(self._connections[user_id])


# Global singleton used across the app
ws_manager = ConnectionManager()
