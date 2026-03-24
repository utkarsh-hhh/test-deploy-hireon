"""
Analytics aggregation service.
"""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application
from app.models.candidate import Candidate
from app.models.interview import Interview
from app.models.job import Job
from app.models.offer import Offer
from app.models.scorecard import Scorecard
from app.schemas.analytics import (
    AnalyticsOverview, FunnelStage, FunnelData,
    ScoreDistributionBucket, TimeToHireData, InterviewerPerformance
)
from app.utils.permissions import ApplicationStage, OfferStatus


async def get_overview(org_id: uuid.UUID, db: AsyncSession) -> AnalyticsOverview:
    """High-level KPI overview for the org."""

    # Combine all counts into a single query using scalar subqueries
    # This reduces 8 round-trips to 1.
    stmt = select(
        select(func.count(Job.id)).where(Job.organization_id == org_id).scalar_subquery().label("total_jobs"),
        select(func.count(Job.id)).where(Job.organization_id == org_id, Job.status == "active").scalar_subquery().label("active_jobs"),
        select(func.count(Application.id)).where(Application.organization_id == org_id).scalar_subquery().label("total_apps"),
        select(func.count(Candidate.id)).where(Candidate.organization_id == org_id).scalar_subquery().label("total_candidates"),
        select(func.count(Interview.id)).where(Interview.organization_id == org_id).scalar_subquery().label("interviews_scheduled"),
        select(func.count(Offer.id)).where(
            Offer.organization_id == org_id, Offer.status.in_(["sent", "accepted", "declined"])
        ).scalar_subquery().label("offers_sent"),
        select(func.count(Offer.id)).where(
            Offer.organization_id == org_id, Offer.status == OfferStatus.ACCEPTED
        ).scalar_subquery().label("offers_accepted"),
        select(func.avg(Application.match_score)).where(
            Application.organization_id == org_id, Application.match_score.isnot(None)
        ).scalar_subquery().label("avg_score")
    )

    row = (await db.execute(stmt)).first()
    
    return AnalyticsOverview(
        total_jobs=row.total_jobs or 0,
        active_jobs=row.active_jobs or 0,
        total_applications=row.total_apps or 0,
        total_candidates=row.total_candidates or 0,
        interviews_scheduled=row.interviews_scheduled or 0,
        offers_sent=row.offers_sent or 0,
        offers_accepted=row.offers_accepted or 0,
        avg_match_score=round(float(row.avg_score), 1) if row.avg_score else None,
        time_to_hire_days=None,
    )


async def get_funnel(org_id: uuid.UUID, job_id: uuid.UUID | None, db: AsyncSession) -> FunnelData:
    """Application funnel by stage."""
    stages = [s.value for s in ApplicationStage]
    
    conditions = [Application.organization_id == org_id]
    if job_id:
        conditions.append(Application.job_id == job_id)

    # Use GROUP BY to get all stage counts in one query
    stmt = (
        select(Application.stage, func.count(Application.id))
        .where(*conditions)
        .group_by(Application.stage)
    )
    
    result_rows = (await db.execute(stmt)).all()
    counts = {row[0]: row[1] for row in result_rows}
    total = sum(counts.values())

    result = []
    for stage in stages:
        count = counts.get(stage, 0)
        result.append(FunnelStage(
            stage=stage,
            count=count,
            percentage=round(count / total * 100, 1) if total > 0 else 0.0,
        ))

    return FunnelData(job_id=str(job_id) if job_id else None, stages=result)


async def get_score_distribution(org_id: uuid.UUID, db: AsyncSession) -> list[ScoreDistributionBucket]:
    """Distribute application match scores into buckets."""
    # Use CASE to bucket scores in a single query
    stmt = select(
        func.count(Application.id).filter(and_(Application.match_score >= 0, Application.match_score <= 20)).label("bucket1"),
        func.count(Application.id).filter(and_(Application.match_score >= 21, Application.match_score <= 40)).label("bucket2"),
        func.count(Application.id).filter(and_(Application.match_score >= 41, Application.match_score <= 60)).label("bucket3"),
        func.count(Application.id).filter(and_(Application.match_score >= 61, Application.match_score <= 80)).label("bucket4"),
        func.count(Application.id).filter(and_(Application.match_score >= 81, Application.match_score <= 100)).label("bucket5"),
    ).where(Application.organization_id == org_id)

    row = (await db.execute(stmt)).first()
    
    return [
        ScoreDistributionBucket(range="0-20", count=row.bucket1 or 0),
        ScoreDistributionBucket(range="21-40", count=row.bucket2 or 0),
        ScoreDistributionBucket(range="41-60", count=row.bucket3 or 0),
        ScoreDistributionBucket(range="61-80", count=row.bucket4 or 0),
        ScoreDistributionBucket(range="81-100", count=row.bucket5 or 0),
    ]


async def get_interviewer_performance(org_id: uuid.UUID, db: AsyncSession) -> list[InterviewerPerformance]:
    """Per-interviewer scorecard stats."""
    from app.models.user import User
    from app.models.interview import InterviewPanelist

    result = await db.execute(
        select(
            User.id, User.full_name,
            func.count(InterviewPanelist.id).label("interviews"),
            func.avg(Scorecard.overall_rating).label("avg_rating"),
            func.count(Scorecard.id).label("scorecards"),
        )
        .join(InterviewPanelist, InterviewPanelist.user_id == User.id)
        .join(Interview, Interview.id == InterviewPanelist.interview_id)
        .outerjoin(Scorecard, and_(Scorecard.interview_id == Interview.id, Scorecard.submitted_by_id == User.id))
        .where(Interview.organization_id == org_id)
        .group_by(User.id, User.full_name)
    )
    rows = result.all()
    return [
        InterviewerPerformance(
            interviewer_id=str(row.id),
            interviewer_name=row.full_name,
            interviews_conducted=row.interviews or 0,
            avg_rating_given=round(float(row.avg_rating), 2) if row.avg_rating else None,
            scorecards_submitted=row.scorecards or 0,
        )
        for row in rows
    ]
