import uuid
from fastapi import APIRouter, Query
from app.dependencies import DB, CurrentUser, RecruiterUser
from app.services import analytics_service

router = APIRouter(prefix="/v1/analytics", tags=["analytics"])


@router.get("/overview")
async def overview(current_user: RecruiterUser, db: DB):
    return await analytics_service.get_overview(current_user.organization_id, db)


@router.get("/funnel")
async def funnel(
    current_user: RecruiterUser,
    db: DB,
    job_id: uuid.UUID | None = Query(default=None),
):
    return await analytics_service.get_funnel(current_user.organization_id, job_id, db)


@router.get("/score-distribution")
async def score_distribution(current_user: RecruiterUser, db: DB):
    return await analytics_service.get_score_distribution(current_user.organization_id, db)


@router.get("/interviewer-performance")
async def interviewer_performance(current_user: RecruiterUser, db: DB):
    return await analytics_service.get_interviewer_performance(current_user.organization_id, db)
