"""
FastAPI dependencies: DB session, current user, role guards.
"""
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.utils.permissions import UserRole, RECRUITER_ROLES, INTERVIEWER_ROLES, ADMIN_ONLY
from app.utils.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Validate access token and return the authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


# ── Role dependencies ──────────────────────────────────────────────────────────

def require_roles(*roles: UserRole):
    """Factory: returns a dependency that checks the user has one of the given roles."""
    async def _check(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if current_user.role not in {r.value for r in roles}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {[r.value for r in roles]}",
            )
        return current_user
    return _check


async def require_recruiter(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    if current_user.role not in {r.value for r in RECRUITER_ROLES}:
        raise HTTPException(status_code=403, detail="Recruiter or Admin access required")
    return current_user


async def require_interviewer_or_above(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    if current_user.role not in {r.value for r in INTERVIEWER_ROLES}:
        raise HTTPException(status_code=403, detail="Interviewer or above access required")
    return current_user


async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    if current_user.role not in {r.value for r in ADMIN_ONLY}:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# Type aliases
CurrentUser = Annotated[User, Depends(get_current_user)]
RecruiterUser = Annotated[User, Depends(require_recruiter)]
InterviewerUser = Annotated[User, Depends(require_interviewer_or_above)]
AdminUser = Annotated[User, Depends(require_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]
