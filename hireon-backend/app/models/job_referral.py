import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class JobReferral(Base):
    __tablename__ = "job_referrals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # The candidate making the referral
    referrer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )

    referee_first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    referee_last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    referee_email: Mapped[str] = mapped_column(String(255), nullable=False)
    referee_phone: Mapped[str | None] = mapped_column(String(50))
    relation_to_referrer: Mapped[str | None] = mapped_column(String(100))
    reason: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    job: Mapped["Job"] = relationship("Job", lazy="noload")
    referrer: Mapped["Candidate"] = relationship("Candidate", lazy="noload")
