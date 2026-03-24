"""
Candidate portal endpoints — for candidates to self-register, view their own applications,
respond to offers, and view interview schedules.
"""
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from app.dependencies import DB, CurrentUser
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.interview import Interview
from app.models.offer import Offer
from app.models.job import Job
from app.models.other_offer import OtherOffer
from app.models.job_referral import JobReferral
from app.models.candidate_document import CandidateDocument
from app.schemas.application import ApplicationOut
from app.schemas.interview import InterviewOut
from app.schemas.offer import OfferOut, OfferRespondRequest
from app.schemas.candidate import CandidateOut, CandidateUpdate
from app.schemas.job import JobOut
from app.schemas.job_referral import JobReferralCreate, JobReferralOut
from app.schemas.other_offer import OtherOfferCreate, OtherOfferOut
from app.schemas.candidate_document import CandidateDocumentCreate, CandidateDocumentOut
from app.utils.permissions import UserRole, OfferStatus
from app.services.ai_evaluator import generate_prep_materials
from datetime import datetime, timezone
from app.services.storage_service import save_resume
from app.services.resume_parser import parse_resume

router = APIRouter(prefix="/v1/portal", tags=["portal"])


class PortalRegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    organization_slug: str


@router.post("/register", status_code=201)
async def portal_register(data: PortalRegisterRequest, db: DB):
    """Self-registration for candidates through the portal."""
    from app.models.organization import Organization
    from app.models.user import User
    from app.utils.security import hash_password, create_access_token, create_refresh_token
    from app.config import settings
    from datetime import timedelta
    from app.models.user import RefreshToken

    org = (await db.execute(select(Organization).where(Organization.slug == data.organization_slug))).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    existing_user = (await db.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        organization_id=org.id,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=UserRole.CANDIDATE,
        is_verified=True,
    )
    db.add(user)
    await db.flush()

    # Create candidate profile linked to user
    candidate = Candidate(
        organization_id=org.id,
        user_id=user.id,
        email=data.email,
        full_name=data.full_name,
    )
    db.add(candidate)

    access_token = create_access_token({"sub": str(user.id), "org": str(org.id), "role": user.role})
    refresh_tok = create_refresh_token()
    db.add(RefreshToken(
        user_id=user.id,
        token=refresh_tok,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
    ))

    return {"access_token": access_token, "refresh_token": refresh_tok, "token_type": "bearer"}


@router.get("/my-applications")
async def my_applications(current_user: CurrentUser, db: DB):
    """Candidate views their own applications."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
    candidate = (await db.execute(
        select(Candidate).where(Candidate.user_id == current_user.id)
    )).scalar_one_or_none()
    if not candidate:
        return []
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Application)
        .where(Application.candidate_id == candidate.id)
        .options(selectinload(Application.job))
    )
    return [ApplicationOut.model_validate(a).model_dump() for a in result.scalars().all()]


@router.get("/my-interviews")
async def my_interviews(current_user: CurrentUser, db: DB):
    """Candidate views their scheduled interviews."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
    candidate = (await db.execute(
        select(Candidate).where(Candidate.user_id == current_user.id)
    )).scalar_one_or_none()
    if not candidate:
        return []
    result = await db.execute(
        select(Interview).where(Interview.candidate_id == candidate.id)
    )
    return [InterviewOut.model_validate(i).model_dump() for i in result.scalars().all()]


@router.get("/my-offers")
async def my_offers(current_user: CurrentUser, db: DB):
    """Candidate views their offers."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
    candidate = (await db.execute(
        select(Candidate).where(Candidate.user_id == current_user.id)
    )).scalar_one_or_none()
    if not candidate:
        return []
    apps = (await db.execute(
        select(Application).where(Application.candidate_id == candidate.id)
    )).scalars().all()
    app_ids = [a.id for a in apps]
    if not app_ids:
        return []
    result = await db.execute(
        select(Offer).where(Offer.application_id.in_(app_ids))
    )
    return [OfferOut.model_validate(o).model_dump() for o in result.scalars().all()]


@router.post("/offers/{offer_id}/respond")
async def portal_respond_offer(offer_id: uuid.UUID, data: OfferRespondRequest, current_user: CurrentUser, db: DB):
    """Candidate accepts or declines their offer via portal."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")

    result = await db.execute(
        select(Offer).where(Offer.id == offer_id)
    )
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    offer.status = OfferStatus.ACCEPTED if data.accept else OfferStatus.DECLINED
    offer.responded_at = datetime.now(timezone.utc)
    if not data.accept:
        offer.decline_reason = data.decline_reason
    return OfferOut.model_validate(offer)


@router.get("/profile")
async def portal_profile(current_user: CurrentUser, db: DB):
    """Candidate views their own profile."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
    from app.schemas.candidate import CandidateOut
    candidate = (await db.execute(
        select(Candidate).where(Candidate.user_id == current_user.id)
    )).scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    return CandidateOut.model_validate(candidate)


@router.put("/profile")
async def update_portal_profile(data: CandidateUpdate, current_user: CurrentUser, db: DB):
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
        
    result = await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(candidate, field, value)

    await db.commit()
    await db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


@router.post("/profile/resume", response_model=CandidateOut)
async def upload_portal_resume(
    current_user: CurrentUser,
    db: DB,
    file: UploadFile = File(...),
):
    """Candidate self-uploads their resume; AI-parses and updates their profile."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")

    candidate = (await db.execute(
        select(Candidate).where(Candidate.user_id == current_user.id)
    )).scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Profile not found")

    file_content = await file.read()
    await file.seek(0)
    url, original_name = await save_resume(file, str(current_user.organization_id))
    parsed = await parse_resume(file_content, file.content_type or "", file.filename or "")

    candidate.resume_url = url
    candidate.resume_filename = original_name
    if parsed.get("skills"):
        candidate.skills = parsed["skills"][:30]
    if parsed.get("years_experience"):
        candidate.years_experience = parsed["years_experience"]
    if parsed.get("current_title"):
        candidate.current_title = parsed["current_title"]
    if parsed.get("summary"):
        candidate.summary = parsed["summary"]

    # If the candidate was stuck in 'needs_review' (set by AI scoring before
    # they completed their profile), clear it so the recruiter sees them as
    # "In Review" and can evaluate them properly.
    if candidate.pipeline_stage in (None, "needs_review"):
        candidate.pipeline_stage = None

    await db.commit()
    await db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


@router.post("/profile/other-offers")
async def add_other_offer(data: OtherOfferCreate, current_user: CurrentUser, db: DB):
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
        
    candidate = (await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))).scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Profile not found")

    offer = OtherOffer(
        candidate_id=candidate.id,
        company_name=data.company_name,
        role=data.role,
        ctc=data.ctc,
        validity_date=data.validity_date
    )
    db.add(offer)
    await db.commit()
    await db.refresh(offer)
    return OtherOfferOut.model_validate(offer)


@router.delete("/profile/other-offers/{offer_id}")
async def remove_other_offer(offer_id: uuid.UUID, current_user: CurrentUser, db: DB):
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
        
    candidate = (await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))).scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Profile not found")

    offer = (await db.execute(select(OtherOffer).where(OtherOffer.id == offer_id, OtherOffer.candidate_id == candidate.id))).scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
        
    await db.delete(offer)
    await db.commit()


@router.get("/jobs")
async def portal_get_jobs(current_user: CurrentUser, db: DB):
    """Candidate views open jobs within the organization."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
        
    result = await db.execute(
        select(Job).where(Job.organization_id == current_user.organization_id, Job.status == "active")
    )
    return [JobOut.model_validate(j).model_dump() for j in result.scalars().all()]


@router.post("/jobs/{job_id}/apply", response_model=ApplicationOut, status_code=201)
async def portal_apply_to_job(job_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Candidate self-applies to an active job within the organization."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")

    candidate = (await db.execute(
        select(Candidate).where(Candidate.user_id == current_user.id)
    )).scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    if not candidate.resume_url:
        raise HTTPException(status_code=400, detail="Please upload a resume before applying")

    # Verify the job exists and belongs to the same org
    job = (await db.execute(
        select(Job).where(Job.id == job_id, Job.organization_id == current_user.organization_id, Job.status == "active")
    )).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer active")

    # Prevent duplicate applications
    existing = (await db.execute(
        select(Application).where(
            Application.candidate_id == candidate.id,
            Application.job_id == job.id,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this job")

    application = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        stage="applied",
        organization_id=current_user.organization_id,
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)
    from sqlalchemy.orm import selectinload
    app_with_job = (await db.execute(
        select(Application).where(Application.id == application.id).options(selectinload(Application.job))
    )).scalar_one()
    return ApplicationOut.model_validate(app_with_job)


@router.post("/jobs/{job_id}/refer")
async def portal_refer_job(job_id: uuid.UUID, data: JobReferralCreate, current_user: CurrentUser, db: DB):
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
        
    candidate = (await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))).scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Profile not found")

    job = (await db.execute(select(Job).where(Job.id == job_id))).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    referral = JobReferral(
        job_id=job.id,
        referrer_id=candidate.id,
        referee_first_name=data.referee_first_name,
        referee_last_name=data.referee_last_name,
        referee_email=data.referee_email,
        referee_phone=data.referee_phone,
        relationship=data.relationship,
        reason=data.reason
    )
    db.add(referral)
    await db.commit()
    await db.refresh(referral)
    return JobReferralOut.model_validate(referral)


@router.get("/documents")
async def portal_get_documents(current_user: CurrentUser, db: DB):
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
        
    candidate = (await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))).scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Profile not found")

    docs = await db.execute(select(CandidateDocument).where(CandidateDocument.candidate_id == candidate.id))
    return [CandidateDocumentOut.model_validate(d).model_dump() for d in docs.scalars().all()]


@router.post("/documents")
async def portal_add_document(data: CandidateDocumentCreate, current_user: CurrentUser, db: DB):
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
        
    candidate = (await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))).scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Profile not found")

    doc = CandidateDocument(
        candidate_id=candidate.id,
        doc_type=data.doc_type,
        file_url=data.file_url,
        status=data.status
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return CandidateDocumentOut.model_validate(doc)


@router.get("/applications/{application_id}/prep-hub")
async def portal_prep_hub(application_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """
    Candidates fetch AI-generated prep materials specific to their application's job.
    """
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(status_code=403, detail="Candidates only")
        
    candidate = (await db.execute(select(Candidate).where(Candidate.user_id == current_user.id))).scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Profile not found")

    app_result = await db.execute(select(Application).where(Application.id == application_id, Application.candidate_id == candidate.id))
    application = app_result.scalar_one_or_none()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
        
    job_result = await db.execute(select(Job).where(Job.id == application.job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Associated Job not found")
        
    # Generate prep materials dynamically
    # Use description or skills required + candidate resume
    desc = job.description or ""
    skills = " ".join(job.skills_required or [])
    
    candidate_summary = candidate.summary or ""
    candidate_skills = " ".join(candidate.skills or [])
    resume_highlights = f"Summary: {candidate_summary}\nSkills: {candidate_skills}"
    
    materials = await generate_prep_materials(job.title, f"{desc} {skills}", resume_highlights)
    return materials
