import logging
import uuid
import httpx
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db, CurrentUser
from app.models.user import User

router = APIRouter(prefix="/v1/calendar", tags=["calendar"])
logger = logging.getLogger(__name__)

# Essential scopes for calendar and meet link generation
SCOPES = " ".join(["https://www.googleapis.com/auth/calendar.events"])


@router.get("/auth")
async def google_calendar_auth(current_user: CurrentUser):
    """Initiates the manual Google OAuth2 flow for Calendar access."""
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=400, detail="Google Calendar is not configured")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": str(current_user.id),
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    logger.info(f"Generated manual auth URL for user {current_user.email}")
    
    return {"auth_url": auth_url}


@router.get("/callback")
async def google_calendar_callback(
    request: Request,
    state: str = Query(...),
    code: str = Query(None),
    error: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Callback for Google OAuth2. Saves the refresh token to the user."""
    if error:
        logger.error(f"Google Calendar OAuth error: {error}")
        return RedirectResponse(url=f"{settings.frontend_url}/recruiter?error=calendar_auth_failed")

    if not code:
        logger.error("No authorization code received in callback")
        return RedirectResponse(url=f"{settings.frontend_url}/recruiter?error=calendar_auth_failed")

    try:
        # Exchange code for tokens using httpx directly
        # By constructing the auth URL manually WITHOUT a code_challenge,
        # we don't need to provide a code_verifier here.
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.google_redirect_uri,
                }
            )
            
            if token_response.status_code != 200:
                logger.error(f"Failed to exchange code for token: {token_response.text}")
                return RedirectResponse(url=f"{settings.frontend_url}/recruiter?error=calendar_auth_failed")
            
            tokens = token_response.json()
            refresh_token = tokens.get("refresh_token")
            
            logger.info(f"Callback successful. Received refresh token: {bool(refresh_token)}")
            
            if refresh_token:
                user_id = uuid.UUID(state)
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                if user:
                    user.google_refresh_token = refresh_token
                    await db.commit()
                    logger.info(f"Successfully connected Google Calendar for user {user.email}")
                else:
                    logger.error(f"User {state} not found during calendar callback")
            else:
                logger.warning(f"No refresh token returned for user {state}. Ensure prompt='consent' was used.")
                    
        return RedirectResponse(url=f"{settings.frontend_url}/recruiter?success=calendar_connected")
        
    except Exception as e:
        logger.error(f"Google Calendar callback failed: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/recruiter?error=calendar_auth_failed")
