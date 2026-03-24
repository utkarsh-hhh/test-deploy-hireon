from fastapi import APIRouter, HTTPException, status, Response
from app.dependencies import DB
from app.schemas.invitation import InvitationOut, InvitationVerify, InvitationUse
from app.services import invitation_service

router = APIRouter(prefix="/v1/invitations", tags=["invitations"])

@router.get("/verify/{token}", response_model=InvitationOut)
async def verify_invitation(token: str, db: DB):
    """Verify an invitation token and return details."""
    invitation = await invitation_service.verify_token(db, token)
    # We need to inject full_name since it's in Candidate model
    candidate = await invitation.load_candidate(db)
    out = InvitationOut.model_validate(invitation)
    out.full_name = candidate.full_name if candidate else ""
    return out

@router.post("/use/{token}")
async def use_invitation(token: str, data: InvitationUse, response: Response, db: DB):
    """Mark an invitation token as used and set password."""
    result = await invitation_service.use_invitation(db, token, password=data.password)
    
    if "access_token" in result:
        # Set refresh token in cookie for immediate login
        response.set_cookie(
            key="refresh_token",
            value=result["refresh_token"],
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=30 * 24 * 3600,
            path="/v1/auth/refresh",
        )
    return result
