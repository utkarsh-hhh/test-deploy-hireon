import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, ARRAY, Float, desc
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Optional link to a portal user account
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50))
    location: Mapped[str | None] = mapped_column(String(255))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    portfolio_url: Mapped[str | None] = mapped_column(String(500))
    github_url: Mapped[str | None] = mapped_column(String(500))

    # Resume
    resume_url: Mapped[str | None] = mapped_column(String(500))
    resume_filename: Mapped[str | None] = mapped_column(String(255))

    # AI-parsed data stored as JSON
    parsed_data: Mapped[dict | None] = mapped_column(JSONB)  # skills, experience, education, etc.
    skills: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    years_experience: Mapped[int | None] = mapped_column(Integer)
    experience_years: Mapped[str | None] = mapped_column(String(50))
    notice_period_days: Mapped[str | None] = mapped_column(String(50))
    current_ctc: Mapped[str | None] = mapped_column(String(100))
    expected_ctc: Mapped[str | None] = mapped_column(String(100))
    work_mode_preference: Mapped[str | None] = mapped_column(String(100))
    availability_status: Mapped[str | None] = mapped_column(String(100))
    interview_availability_days: Mapped[str | None] = mapped_column(String(100))
    interview_time_slot: Mapped[str | None] = mapped_column(String(100))
    blackout_dates: Mapped[str | None] = mapped_column(String(255))
    weekend_interviews: Mapped[bool] = mapped_column(default=False, server_default="false")
    current_title: Mapped[str | None] = mapped_column(String(255))
    current_company: Mapped[str | None] = mapped_column(String(255))
    summary: Mapped[str | None] = mapped_column(Text)

    # AI match score (set when resume is uploaded with job requirements)
    match_score: Mapped[float | None] = mapped_column(Float)
    score_breakdown: Mapped[dict | None] = mapped_column(JSONB)

    # Pipeline stage — independent of any job
    pipeline_stage: Mapped[str | None] = mapped_column(String(50), default=None, server_default=None, nullable=True)

    # Talent pool tags
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    # HR / Recruiter notes
    hr_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Job title they are currently being considered for (syncs with latest application)
    applied_job_title: Mapped[str | None] = mapped_column(String(255), nullable=True)

    source: Mapped[str | None] = mapped_column(String(100))  # linkedin, referral, job_board, etc.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    applications: Mapped[list["Application"]] = relationship("Application", back_populates="candidate", lazy="noload")
    invitations: Mapped[list["CandidateInvitation"]] = relationship(
        "CandidateInvitation", 
        back_populates="candidate", 
        lazy="noload", 
        cascade="all, delete-orphan",
        order_by=lambda: desc("created_at")
    )
    other_offers: Mapped[list["OtherOffer"]] = relationship(
        "OtherOffer", back_populates="candidate", lazy="noload", cascade="all, delete-orphan"
    )
    documents: Mapped[list["CandidateDocument"]] = relationship(
        "CandidateDocument", back_populates="candidate", lazy="noload", cascade="all, delete-orphan"
    )
