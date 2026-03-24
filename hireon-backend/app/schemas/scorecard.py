from datetime import datetime
from pydantic import BaseModel, field_validator
from app.schemas.base import OrmSchema


class CriterionScore(BaseModel):
    criterion: str
    score: int  # 1-5
    notes: str | None = None


class ScorecardCreate(BaseModel):
    interview_id: str
    application_id: str | None = None
    overall_rating: int
    recommendation: str  # strong_yes, yes, maybe, no, strong_no
    criteria_scores: list[CriterionScore] | None = None
    strengths: str | None = None
    weaknesses: str | None = None
    summary: str | None = None

    @field_validator("overall_rating")
    @classmethod
    def rating_range(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("recommendation")
    @classmethod
    def valid_recommendation(cls, v: str) -> str:
        valid = {"strong_yes", "yes", "maybe", "no", "strong_no"}
        if v not in valid:
            raise ValueError(f"Recommendation must be one of: {valid}")
        return v


class ScorecardOut(OrmSchema):
    id: str
    organization_id: str
    interview_id: str
    application_id: str | None = None
    submitted_by_id: str
    overall_rating: int
    recommendation: str
    criteria_scores: list[CriterionScore] | None = None
    strengths: str | None = None
    weaknesses: str | None = None
    summary: str | None = None
    submitted_at: datetime
    submitted_by_name: str | None = None
