import uuid
import logging
from dataclasses import dataclass, field
from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from app.dependencies import DB, CurrentUser, RecruiterUser
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateOut
from app.services.storage_service import save_resume, read_file_bytes
from app.services.resume_parser import parse_resume
from app.services.activity_service import log_activity



@dataclass
class _JobReq:
    """Lightweight wrapper so upload-and-create can use the real ML scorer."""
    title: str
    description: str = ""
    requirements: str = ""
    skills_required: list = field(default_factory=list)
    min_experience_years: float = 0
    experience_level: str = ""

router = APIRouter(prefix="/v1/resumes", tags=["resumes"])
logger = logging.getLogger(__name__)


@router.post("/upload/{candidate_id}", response_model=CandidateOut)
async def upload_resume(
    candidate_id: uuid.UUID,
    current_user: RecruiterUser,
    db: DB,
    file: UploadFile = File(...),
):
    """Upload a resume for an existing candidate. Triggers AI parsing."""
    result = await db.execute(
        select(Candidate).where(
            Candidate.id == candidate_id,
            Candidate.organization_id == current_user.organization_id,
        )
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    file_content = await file.read()
    await file.seek(0)
    url, original_name = await save_resume(file, str(current_user.organization_id))
    parsed = await parse_resume(file_content, file.content_type or "", file.filename or "")

    candidate.resume_url = url
    candidate.resume_filename = original_name
    candidate.parsed_data = parsed

    if parsed.get("skills"):
        candidate.skills = parsed["skills"][:30]
    if parsed.get("years_experience"):
        candidate.years_experience = parsed["years_experience"]
    if parsed.get("current_title"):
        candidate.current_title = parsed["current_title"]
    if parsed.get("current_company"):
        candidate.current_company = parsed["current_company"]
    if parsed.get("summary"):
        candidate.summary = parsed["summary"]
    if parsed.get("full_name") and not candidate.full_name:
        candidate.full_name = parsed["full_name"]
    if parsed.get("phone") and not candidate.phone:
        candidate.phone = parsed["phone"]
    if parsed.get("location") and not candidate.location:
        candidate.location = parsed["location"]

    return CandidateOut.model_validate(candidate)


@router.post("/upload-and-create", response_model=CandidateOut, status_code=201)
async def upload_and_create(
    background_tasks: BackgroundTasks,
    current_user: RecruiterUser,
    db: DB,
    file: UploadFile = File(...),
    job_id: str | None = Form(None),
    role_title: str = Form(""),
    required_skills: str = Form(""),   # comma-separated
    min_experience: float = Form(0.0),
    match_threshold: float = Form(70.0),
):
    """Upload a resume, parse with AI, score against job requirements, create/update candidate."""
    file_content = await file.read()
    await file.seek(0)

    parsed = await parse_resume(file_content, file.content_type or "", file.filename or "")

    # Priority 4: fail fast if no email — don't create ghost candidates
    email = parsed.get("email")
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Could not extract email from resume. Please enter it manually."
        )
    full_name = parsed.get("full_name") or "Unknown Candidate"

    # Check for duplicate
    existing = await db.execute(
        select(Candidate).where(
            Candidate.email == email,
            Candidate.organization_id == current_user.organization_id,
        )
    )
    candidate = existing.scalar_one_or_none()
    if candidate:
        logger.info(f"Duplicate email match found: {email} for existing candidate {candidate.full_name} (ID: {candidate.id})")

    # Priority 1: compute score using the real ML scorer
    req_skills_list = [s.strip() for s in required_skills.split(",") if s.strip()]
    score: float | None = None
    breakdown: dict | None = None
    
    from app.models.job import Job
    job = None
    if job_id and job_id.lower() not in ("null", "undefined", ""):
        try:
            job_res = await db.execute(select(Job).where(Job.id == uuid.UUID(job_id)))
            job = job_res.scalar_one_or_none()
        except ValueError:
            pass
    
    if job or req_skills_list or min_experience > 0:
        if not job:
            job = _JobReq(
                title=role_title,
                skills_required=req_skills_list,
                min_experience_years=min_experience,
            )
        
        job_skills = list(job.skills_required or []) if not isinstance(job, _JobReq) else req_skills_list
        job_title = job.title
        
        from app.services.match_scorer import evaluate_candidate_match
        score, breakdown = await evaluate_candidate_match(
            candidate_data=parsed,
            candidate_skills=parsed.get("skills", []),
            years_experience=parsed.get("years_experience"),
            job=job,
            match_threshold=match_threshold,
        )

    # Priority 2: never auto-reject — low score → needs_review, not rejected
    # User Request: Don't automatically add to pipeline. Allow recruiter to click "Add to Pipeline".
    initial_stage = None
    if score is not None and match_threshold is not None and score < float(match_threshold):
        initial_stage = "needs_review"

    if not candidate:
        candidate = Candidate(
            organization_id=current_user.organization_id,
            email=email,
            full_name=full_name,
            pipeline_stage=initial_stage,
        )
        db.add(candidate)
        await db.flush()
    # If candidate exists, we don't automatically overwrite their current pipeline stage during a simple resume update/re-score
    # unless it was previously None or needs_review and we want to keep it that way.
    # Actually, if they are already in the pipeline (e.g. 'interview'), we definitely don't want to reset them to None.
    elif candidate.pipeline_stage is None or candidate.pipeline_stage == "needs_review":
        candidate.pipeline_stage = initial_stage

    url, original_name = await save_resume(file, str(current_user.organization_id))
    candidate.resume_url = url
    candidate.resume_filename = original_name
    candidate.full_name = full_name or candidate.full_name
    candidate.skills = parsed.get("skills", [])[:30]
    candidate.years_experience = parsed.get("years_experience")
    candidate.current_title = parsed.get("current_title") or role_title or candidate.current_title
    candidate.current_company = parsed.get("current_company")
    candidate.summary = parsed.get("summary")
    candidate.phone = candidate.phone or parsed.get("phone")
    candidate.location = candidate.location or parsed.get("location")
    candidate.match_score = score
    candidate.applied_job_title = job.title if job else (role_title or candidate.applied_job_title)
    # Priority 6: score breakdown is a separate field, not buried in parsed_data
    candidate.score_breakdown = breakdown
    candidate.parsed_data = parsed

    await log_activity(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="CREATE",
        resource_type="candidate",
        resource_id=str(candidate.id),
        details={"name": candidate.full_name}
    )

    return CandidateOut.model_validate(candidate)
