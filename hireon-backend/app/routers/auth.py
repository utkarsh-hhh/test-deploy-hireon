from fastapi import APIRouter, Response, Cookie
from datetime import datetime, timezone
from app.dependencies import DB, CurrentUser
from app.schemas.auth import RegisterRequest, LoginRequest, RefreshRequest, TokenResponse, UserOut, ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.services import auth_service
from app.utils.security import hash_password, verify_password
from sqlalchemy import select
from app.models.user import User

router = APIRouter(prefix="/v1/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(data: RegisterRequest, db: DB):
    return await auth_service.register_user(data, db)


@router.post("/login")
async def login(data: LoginRequest, response: Response, db: DB):
    result = await auth_service.login_user(data, db)
    # Set refresh token in HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        secure=False,   # set True in production with HTTPS
        samesite="lax",
        max_age=30 * 24 * 3600,
        path="/v1/auth/refresh",
    )
    return {"access_token": result["access_token"], "token_type": "bearer", "user": result["user"]}


@router.post("/refresh")
async def refresh(
    db: DB,
    response: Response,
    # Accept from cookie OR body
    body: RefreshRequest | None = None,
    refresh_token_cookie: str | None = Cookie(default=None, alias="refresh_token"),
):
    token = (body.refresh_token if body else None) or refresh_token_cookie
    if not token:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="No refresh token provided")
    result = await auth_service.refresh_access_token(token, db)
    response.set_cookie(
        key="refresh_token",
        value=result["refresh_token"],
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=30 * 24 * 3600,
        path="/v1/auth/refresh",
    )
    return {"access_token": result["access_token"], "token_type": "bearer", "user": result["user"]}


@router.post("/logout")
async def logout(
    response: Response,
    db: DB,
    body: RefreshRequest | None = None,
    refresh_token_cookie: str | None = Cookie(default=None, alias="refresh_token"),
):
    token = (body.refresh_token if body else None) or refresh_token_cookie
    if token:
        await auth_service.logout_user(token, db)
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser):
    return UserOut.model_validate(current_user)


@router.put("/me/password")
async def change_password(data: ChangePasswordRequest, current_user: CurrentUser, db: DB):
    if not verify_password(data.current_password, current_user.hashed_password):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(data.new_password)
    return {"message": "Password updated successfully"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: DB):
    from app.models.password_reset import PasswordResetToken
    from app.services.email_service import send_password_reset_email
    import secrets
    from datetime import timedelta

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    # Always return 200 to prevent email enumeration
    if not user or not user.is_active:
        return {"message": "If that email exists, a reset link has been sent."}

    # Invalidate old tokens
    from sqlalchemy import update
    await db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.is_used == False)
        .values(is_used=True)
    )

    token = secrets.token_urlsafe(48)
    db.add(PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
    ))

    from app.config import settings as cfg
    reset_url = f"{cfg.frontend_url}/reset-password?token={token}"
    send_password_reset_email(user.email, user.full_name, reset_url)
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: DB):
    from app.models.password_reset import PasswordResetToken
    from datetime import timezone

    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == data.token,
            PasswordResetToken.is_used == False,
        )
    )
    token_obj = result.scalar_one_or_none()
    if not token_obj or token_obj.expires_at < datetime.now(timezone.utc):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired.")

    user_result = await db.execute(select(User).where(User.id == token_obj.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="User not found.")

    user.hashed_password = hash_password(data.new_password)
    token_obj.is_used = True
    return {"message": "Password reset successfully. You can now log in."}


@router.post("/candidate/magic-link")
async def candidate_magic_link(data: ForgotPasswordRequest, db: DB):
    """
    Send a magic link (invitation) to a candidate. 
    If registration is open for new candidates, create a stub profile.
    """
    from app.models.candidate import Candidate
    from app.models.organization import Organization
    from app.services import invitation_service
    
    # 1. Check if candidate exists
    result = await db.execute(select(Candidate).where(Candidate.email == data.email))
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        # Create a stub candidate for truly new users
        # For multi-tenant, we pick the first org as default 'host' for public signups
        org_result = await db.execute(select(Organization).limit(1))
        org = org_result.scalar_one_or_none()
        
        if not org:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail="System configuration error: No organization found.")
            
        candidate = Candidate(
            organization_id=org.id,
            email=data.email,
            full_name=data.email.split('@')[0].capitalize(), # Simple default name
            source="Magic Link Signup",
            skills=[],
            tags=[],
        )
        db.add(candidate)
        await db.flush()

    # 2. Trigger the invitation flow
    try:
        await invitation_service.create_invitation(
            db=db,
            candidate_id=candidate.id,
            organization_id=candidate.organization_id,
            email=candidate.email,
            full_name=candidate.full_name
        )
        await db.commit()
    except Exception as e:
        await db.rollback()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Failed to send magic link: {str(e)}")

    return {"message": "Magic link sent successfully. Please check your inbox."}
