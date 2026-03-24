import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from app.dependencies import DB, CurrentUser, RecruiterUser
from app.models.offer import Offer
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.organization import Organization
from app.schemas.offer import OfferCreate, OfferUpdate, OfferOut, OfferRespondRequest
from app.services.offer_generator import generate_offer_html, generate_offer_pdf
from app.services.storage_service import save_offer_pdf
from app.services.email_service import send_offer_email
from app.utils.permissions import OfferStatus
from app.services.activity_service import log_activity

router = APIRouter(prefix="/v1/offers", tags=["offers"])


@router.get("")
async def list_offers(current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Offer).where(Offer.organization_id == current_user.organization_id)
    )
    return [OfferOut.model_validate(o).model_dump() for o in result.scalars().all()]


@router.post("", response_model=OfferOut, status_code=201)
async def create_offer(data: OfferCreate, current_user: RecruiterUser, db: DB):
    # Validate application
    app_result = await db.execute(
        select(Application).where(
            Application.id == uuid.UUID(data.application_id),
            Application.organization_id == current_user.organization_id,
        )
    )
    if not app_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Application not found")

    # Prevent duplicate offer
    existing = await db.execute(
        select(Offer).where(Offer.application_id == uuid.UUID(data.application_id))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Offer already exists for this application")

    offer = Offer(
        organization_id=current_user.organization_id,
        created_by_id=current_user.id,
        **data.model_dump(),
        application_id=uuid.UUID(data.application_id),
    )
    db.add(offer)
    await db.flush()
    return OfferOut.model_validate(offer)


@router.get("/{offer_id}", response_model=OfferOut)
async def get_offer(offer_id: uuid.UUID, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.organization_id == current_user.organization_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return OfferOut.model_validate(offer)


@router.put("/{offer_id}", response_model=OfferOut)
async def update_offer(offer_id: uuid.UUID, data: OfferUpdate, current_user: RecruiterUser, db: DB):
    result = await db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.organization_id == current_user.organization_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if offer.status not in {OfferStatus.DRAFT}:
        raise HTTPException(status_code=400, detail="Can only edit draft offers")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(offer, field, value)
    return OfferOut.model_validate(offer)


@router.post("/{offer_id}/generate-pdf", response_model=OfferOut)
async def generate_pdf(offer_id: uuid.UUID, current_user: RecruiterUser, db: DB):
    """Generate and save the offer letter PDF."""
    result = await db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.organization_id == current_user.organization_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    # Get candidate and org
    app = (await db.execute(select(Application).where(Application.id == offer.application_id))).scalar_one_or_none()
    candidate = (await db.execute(select(Candidate).where(Candidate.id == app.candidate_id))).scalar_one_or_none() if app else None
    org = (await db.execute(select(Organization).where(Organization.id == current_user.organization_id))).scalar_one_or_none()

    html = generate_offer_html(
        company_name=org.name if org else "Company",
        candidate_name=candidate.full_name if candidate else "Candidate",
        candidate_email=candidate.email if candidate else "",
        position_title=offer.position_title,
        base_salary=offer.base_salary,
        salary_currency=offer.salary_currency,
        bonus=offer.bonus,
        equity=offer.equity,
        benefits=offer.benefits,
        start_date=offer.start_date,
        expiry_date=offer.expiry_date,
        letter_content=offer.letter_content,
    )

    pdf_bytes = await generate_offer_pdf(html)
    pdf_url = await save_offer_pdf(pdf_bytes, str(current_user.organization_id))
    offer.pdf_url = pdf_url
    offer.letter_content = offer.letter_content or html

    return OfferOut.model_validate(offer)


@router.post("/{offer_id}/send", response_model=OfferOut)
async def send_offer(offer_id: uuid.UUID, current_user: RecruiterUser, db: DB):
    """Mark offer as sent and email the candidate."""
    result = await db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.organization_id == current_user.organization_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    app = (await db.execute(select(Application).where(Application.id == offer.application_id))).scalar_one_or_none()
    candidate = (await db.execute(select(Candidate).where(Candidate.id == app.candidate_id))).scalar_one_or_none() if app else None
    org = (await db.execute(select(Organization).where(Organization.id == current_user.organization_id))).scalar_one_or_none()

    if candidate and org:
        send_offer_email(
            candidate_email=candidate.email,
            candidate_name=candidate.full_name,
            job_title=offer.position_title,
            company_name=org.name,
            offer_url=offer.pdf_url or f"http://localhost:8000/v1/offers/{offer_id}",
        )

    offer.status = OfferStatus.SENT
    offer.sent_at = datetime.now(timezone.utc)
    
    await log_activity(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="OFFER_SENT",
        resource_type="offer",
        resource_id=str(offer.id),
        details={"position": offer.position_title}
    )
    
    return OfferOut.model_validate(offer)


@router.post("/{offer_id}/respond", response_model=OfferOut)
async def respond_to_offer(offer_id: uuid.UUID, data: OfferRespondRequest, current_user: CurrentUser, db: DB):
    """Candidate accepts or declines the offer."""
    result = await db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.organization_id == current_user.organization_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if offer.status != OfferStatus.SENT:
        raise HTTPException(status_code=400, detail="Offer must be in 'sent' state to respond")

    offer.status = OfferStatus.ACCEPTED if data.accept else OfferStatus.DECLINED
    offer.responded_at = datetime.now(timezone.utc)
    if not data.accept:
        offer.decline_reason = data.decline_reason
        
    await log_activity(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="OFFER_RESPONDED",
        resource_type="offer",
        resource_id=str(offer.id),
        details={"status": offer.status, "position": offer.position_title}
    )
    
    return OfferOut.model_validate(offer)


@router.delete("/{offer_id}", status_code=204)
async def revoke_offer(offer_id: uuid.UUID, current_user: RecruiterUser, db: DB):
    result = await db.execute(
        select(Offer).where(Offer.id == offer_id, Offer.organization_id == current_user.organization_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    offer.status = OfferStatus.REVOKED
