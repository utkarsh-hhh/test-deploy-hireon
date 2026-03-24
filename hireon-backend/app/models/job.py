import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.permissions import JobStatus


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    job_type: Mapped[str] = mapped_column(String(50), default="full_time")  # full_time, part_time, contract, remote
    experience_level: Mapped[str | None] = mapped_column(String(50))  # junior, mid, senior, lead
    min_experience_years: Mapped[int | None] = mapped_column(Integer, default=0)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[str | None] = mapped_column(Text)
    responsibilities: Mapped[str | None] = mapped_column(Text)
    benefits: Mapped[str | None] = mapped_column(Text)
    skills_required: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    status: Mapped[str] = mapped_column(String(50), default=JobStatus.ACTIVE)
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False)

    # Job Description File
    jd_url: Mapped[str | None] = mapped_column(String(500))
    jd_filename: Mapped[str | None] = mapped_column(String(255))

    application_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    openings: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="jobs", lazy="noload")
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id], lazy="noload")
    applications: Mapped[list["Application"]] = relationship("Application", back_populates="job", lazy="noload")
