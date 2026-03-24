import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.utils.permissions import OfferStatus


class Offer(Base):
    __tablename__ = "offers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[str] = mapped_column(String(50), default=OfferStatus.DRAFT, index=True)

    # Compensation
    base_salary: Mapped[float] = mapped_column(Float, nullable=False)
    salary_currency: Mapped[str] = mapped_column(String(10), default="USD")
    bonus: Mapped[float | None] = mapped_column(Float)
    equity: Mapped[str | None] = mapped_column(String(100))  # e.g. "0.1% over 4 years"
    benefits: Mapped[str | None] = mapped_column(Text)

    # Role details
    position_title: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Letter
    letter_content: Mapped[str | None] = mapped_column(Text)  # HTML content
    pdf_url: Mapped[str | None] = mapped_column(String(500))

    # Response tracking
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decline_reason: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    application: Mapped["Application"] = relationship("Application", back_populates="offer", lazy="noload")
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id], lazy="noload")
