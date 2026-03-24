import uuid
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from app.dependencies import DB, CurrentUser, InterviewerUser
from app.models.scorecard import Scorecard
from app.models.interview import Interview
from app.schemas.scorecard import ScorecardCreate, ScorecardOut

router = APIRouter(prefix="/v1/scorecards", tags=["scorecards"])


@router.post("", response_model=ScorecardOut, status_code=201)
async def submit_scorecard(data: ScorecardCreate, current_user: InterviewerUser, db: DB):
    # Validate interview belongs to org
    result = await db.execute(
        select(Interview).where(
            Interview.id == uuid.UUID(data.interview_id),
            Interview.organization_id == current_user.organization_id,
        )
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # Prevent duplicate
    dup = await db.execute(
        select(Scorecard).where(
            Scorecard.interview_id == uuid.UUID(data.interview_id),
            Scorecard.submitted_by_id == current_user.id,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Scorecard already submitted for this interview")

    scorecard = Scorecard(
        organization_id=current_user.organization_id,
        interview_id=uuid.UUID(data.interview_id),
        application_id=uuid.UUID(data.application_id) if data.application_id else None,
        submitted_by_id=current_user.id,
        overall_rating=data.overall_rating,
        recommendation=data.recommendation,
        criteria_scores=[c.model_dump() for c in data.criteria_scores] if data.criteria_scores else None,
        strengths=data.strengths,
        weaknesses=data.weaknesses,
        summary=data.summary,
    )
    db.add(scorecard)
    
    # Mark interview completed
    from app.utils.permissions import InterviewStatus
    interview.status = InterviewStatus.COMPLETED
    
    # Automate Stage Transition if recommendation is positive
    if data.recommendation in ("yes", "strong_yes"):
        from app.models.candidate import Candidate
        from app.models.application import Application
        
        # Mapping title to canonical stages
        TITLE_TO_STAGE = {
            "Technical Round": "technical_round_selected",
            "Practical Round": "practical_round_selected",
            "Techno-Functional Round": "techno_functional_selected",
            "Management Round": "management_round_selected",
            "HR Round": "hr_round_selected",
            "Final Round": "hr_round_selected",
        }
        
        target_stage = TITLE_TO_STAGE.get(interview.title, "interview")
        
        # Update Candidate
        cand_res = await db.execute(select(Candidate).where(Candidate.id == interview.candidate_id))
        candidate = cand_res.scalar_one_or_none()
        if candidate:
            candidate.pipeline_stage = target_stage
            
        # Update Application if present
        if interview.application_id:
            app_res = await db.execute(select(Application).where(Application.id == interview.application_id))
            application = app_res.scalar_one_or_none()
            if application:
                application.stage = target_stage

    await db.flush()

    out = ScorecardOut.model_validate(scorecard).model_dump()
    out["submitted_by_name"] = current_user.full_name
    return out


@router.get("/application/{application_id}")
async def list_scorecards_for_application(application_id: uuid.UUID, current_user: CurrentUser, db: DB):
    from app.models.user import User
    result = await db.execute(
        select(Scorecard).where(
            Scorecard.application_id == application_id,
            Scorecard.organization_id == current_user.organization_id,
        )
    )
    scorecards = result.scalars().all()
    out = []
    for sc in scorecards:
        d = ScorecardOut.model_validate(sc).model_dump()
        user = (await db.execute(select(User).where(User.id == sc.submitted_by_id))).scalar_one_or_none()
        d["submitted_by_name"] = user.full_name if user else None
        out.append(d)
    return out


@router.get("/{scorecard_id}", response_model=ScorecardOut)
async def get_scorecard(scorecard_id: uuid.UUID, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Scorecard).where(
            Scorecard.id == scorecard_id,
            Scorecard.organization_id == current_user.organization_id,
        )
    )
    sc = result.scalar_one_or_none()
    if not sc:
        raise HTTPException(status_code=404, detail="Scorecard not found")
    from app.models.user import User
    user = (await db.execute(select(User).where(User.id == sc.submitted_by_id))).scalar_one_or_none()
    d = ScorecardOut.model_validate(sc).model_dump()
    d["submitted_by_name"] = user.full_name if user else None
    return d
