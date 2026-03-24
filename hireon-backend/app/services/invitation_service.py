import secrets
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.invitation import CandidateInvitation
from app.models.candidate import Candidate
from app.models.organization import Organization
from app.models.user import User, RefreshToken
from app.services.email_service import send_candidate_invite
from app.utils.security import hash_password, create_access_token, create_refresh_token
from app.utils.permissions import UserRole
from app.schemas.auth import UserOut

async def create_invitation(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    organization_id: uuid.UUID,
    email: str,
    full_name: str
) -> CandidateInvitation:
    # Check if candidate exists in org
    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.organization_id == organization_id
        )
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found in this organization")

    # Generate secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=48)

    invitation = CandidateInvitation(
        organization_id=organization_id,
        candidate_id=candidate_id,
        email=email,
        token=token,
        expires_at=expires_at
    )
    db.add(invitation)
    await db.flush()

    # Get organization info for the email
    org_result = await db.execute(select(Organization).where(Organization.id == organization_id))
    organization = org_result.scalar_one_or_none()
    company_name = organization.name if organization else "HireOn"

    # Construct portal URL with token
    # Assuming the onboarding page is at /onboarding/:token
    portal_url = f"{settings.frontend_url}/onboarding/{token}"

    send_candidate_invite(
        candidate_email=email,
        candidate_name=full_name,
        company_name=company_name,
        portal_url=portal_url
    )

    return invitation

async def verify_token(db: AsyncSession, token: str) -> CandidateInvitation:
    result = await db.execute(
        select(CandidateInvitation).where(CandidateInvitation.token == token)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid invitation token")

    if invitation.is_used:
        raise HTTPException(status_code=400, detail="Invitation link has already been used")

    if invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation link has expired")

    return invitation

async def use_invitation(db: AsyncSession, token: str, password: str | None = None):
    invitation = await verify_token(db, token)
    
    # Get candidate info
    res = await db.execute(select(Candidate).where(Candidate.id == invitation.candidate_id))
    candidate = res.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if password:
        # Check if user already exists
        user_res = await db.execute(select(User).where(User.email == candidate.email))
        user = user_res.scalar_one_or_none()
        
        if not user:
            # Create a new user for the candidate
            user = User(
                organization_id=candidate.organization_id,
                email=candidate.email,
                full_name=candidate.full_name,
                hashed_password=hash_password(password),
                role=UserRole.CANDIDATE,
                is_active=True,
                is_verified=True
            )
            db.add(user)
            await db.flush()
        else:
            # Update existing user password and role if needed
            user.hashed_password = hash_password(password)
            user.role = UserRole.CANDIDATE
            user.is_active = True
            await db.flush()
        
        # Link candidate to user
        candidate.user_id = user.id
        
        # Mark invitation as used
        invitation.is_used = True
        await db.flush()

        # Generate tokens for immediate login
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
            "message": "Account activated and logged in successfully"
        }
    
    # Simple use (no password, just marks as used)
    invitation.is_used = True
    await db.flush()
    return {"message": "Invitation accepted", "candidate_id": str(candidate.id)}
