"""
Pipeline (Kanban) router — returns all applications for a job grouped by stage.
Used to power the drag-and-drop Kanban board.
"""
import uuid
from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from app.dependencies import DB, CurrentUser, RecruiterUser
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.job import Job
from app.schemas.application import StageUpdate
from app.utils.permissions import ApplicationStage

router = APIRouter(prefix="/v1/pipeline", tags=["pipeline"])


@router.get("/{job_id}")
async def get_pipeline(job_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Return all applications for a job grouped by stage (Kanban board data)."""
    # Validate job belongs to org
    job_result = await db.execute(
        select(Job).where(Job.id == job_id, Job.organization_id == current_user.organization_id)
    )
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    apps_result = await db.execute(
        select(Application).where(
            Application.job_id == job_id,
            Application.organization_id == current_user.organization_id,
        )
    )
    applications = apps_result.scalars().all()

    # Group by stage
    stages: dict[str, list] = {s.value: [] for s in ApplicationStage}

    for app in applications:
        cand_result = await db.execute(select(Candidate).where(Candidate.id == app.candidate_id))
        cand = cand_result.scalar_one_or_none()
        stages[app.stage].append({
            "application_id": str(app.id),
            "candidate_id": str(app.candidate_id),
            "candidate_name": cand.full_name if cand else "Unknown",
            "candidate_email": cand.email if cand else "",
            "avatar_url": None,
            "match_score": app.match_score,
            "applied_at": app.applied_at.isoformat(),
            "stage_changed_at": app.stage_changed_at.isoformat(),
            "recruiter_notes": app.recruiter_notes,
            "skills": cand.skills[:5] if cand else [],
            "current_title": cand.current_title if cand else None,
        })

    return {
        "job": {"id": str(job.id), "title": job.title},
        "stages": stages,
    }


@router.patch("/{application_id}/move")
async def move_card(application_id: uuid.UUID, data: StageUpdate, current_user: RecruiterUser, db: DB):
    """Move a Kanban card to a new stage."""
    from datetime import datetime, timezone
    result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.organization_id == current_user.organization_id,
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    old_stage = app.stage
    app.stage = data.stage
    app.stage_changed_at = datetime.now(timezone.utc)
    if data.rejection_reason:
        app.rejection_reason = data.rejection_reason

    return {"application_id": str(application_id), "from": old_stage, "to": data.stage}
