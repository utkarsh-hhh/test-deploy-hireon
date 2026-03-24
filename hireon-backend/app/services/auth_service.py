"""
Authentication service: register, login, token refresh, logout.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.organization import Organization
from app.models.user import User, RefreshToken
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserOut
from app.utils.permissions import UserRole
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token


async def register_user(data: RegisterRequest, db: AsyncSession) -> dict:
    """Create a new organization and admin user."""
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check slug uniqueness
    slug_check = await db.execute(
        select(Organization).where(Organization.slug == data.organization_slug)
    )
    if slug_check.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Organization slug already taken")

    # Create organization
    org = Organization(
        name=data.organization_name,
        slug=data.organization_slug,
    )
    db.add(org)
    await db.flush()  # get org.id

    # Create admin user
    user = User(
        organization_id=org.id,
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.ADMIN,
        is_verified=True,
    )
    db.add(user)
    await db.flush()

    # Issue tokens
    access_token = create_access_token({"sub": str(user.id), "org": str(org.id), "role": user.role})
    refresh_tok = create_refresh_token()
    db.add(RefreshToken(
        user_id=user.id,
        token=refresh_tok,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    ))

    return {
        "access_token": access_token,
        "refresh_token": refresh_tok,
        "token_type": "bearer",
        "user": UserOut.model_validate(user),
    }


async def login_user(data: LoginRequest, db: AsyncSession) -> dict:
    """Authenticate user and issue tokens."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    # Update last login
    user.last_login = datetime.now(timezone.utc)

    access_token = create_access_token({"sub": str(user.id), "org": str(user.organization_id), "role": user.role})
    refresh_tok = create_refresh_token()
    db.add(RefreshToken(
        user_id=user.id,
        token=refresh_tok,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    ))

    return {
        "access_token": access_token,
        "refresh_token": refresh_tok,
        "token_type": "bearer",
        "user": UserOut.model_validate(user),
    }


async def refresh_access_token(refresh_tok: str, db: AsyncSession) -> dict:
    """Rotate refresh token and issue new access token."""
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == refresh_tok,
            RefreshToken.is_revoked == False,
        )
    )
    token_obj = result.scalar_one_or_none()
    if not token_obj or token_obj.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Revoke old token (rotation)
    token_obj.is_revoked = True

    # Get user
    user_result = await db.execute(select(User).where(User.id == token_obj.user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Issue new tokens
    new_access = create_access_token({"sub": str(user.id), "org": str(user.organization_id), "role": user.role})
    new_refresh = create_refresh_token()
    db.add(RefreshToken(
        user_id=user.id,
        token=new_refresh,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    ))

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "user": UserOut.model_validate(user),
    }


async def logout_user(refresh_tok: str, db: AsyncSession) -> None:
    """Revoke the given refresh token."""
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == refresh_tok))
    token_obj = result.scalar_one_or_none()
    if token_obj:
        token_obj.is_revoked = True
