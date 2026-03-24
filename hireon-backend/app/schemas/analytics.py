from pydantic import BaseModel


class FunnelStage(BaseModel):
    stage: str
    count: int
    percentage: float


class AnalyticsOverview(BaseModel):
    total_jobs: int
    active_jobs: int
    total_applications: int
    total_candidates: int
    interviews_scheduled: int
    offers_sent: int
    offers_accepted: int
    avg_match_score: float | None = None
    time_to_hire_days: float | None = None


class FunnelData(BaseModel):
    job_id: str | None = None
    stages: list[FunnelStage]


class ScoreDistributionBucket(BaseModel):
    range: str   # e.g. "80-100"
    count: int


class TimeToHireData(BaseModel):
    month: str
    avg_days: float


class InterviewerPerformance(BaseModel):
    interviewer_id: str
    interviewer_name: str
    interviews_conducted: int
    avg_rating_given: float | None = None
    scorecards_submitted: int
