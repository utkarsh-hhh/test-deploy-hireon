"""
HireOn — Full Demo Seed (v2)
Run: python seed.py

Covers:
  - Recent Activity feed (audit_logs with HR events)
  - Audit Logs admin page (login/admin events too)
  - AI Insights Top Skills (candidates with rich skills)
  - Recent DB Matches (active jobs + scored candidates)
  - Team page — Internal team + 2 hired/joined candidates
  - Scorecards (criteria_scores as plain list, not dict)
  - Open Positions with mixed statuses (active/draft/paused)
  - Interviews today + upcoming for dashboard
"""
import asyncio
from datetime import datetime, timezone, timedelta

from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.organization import Organization
from app.models.user import User
from app.models.job import Job
from app.models.candidate import Candidate
from app.models.application import Application
from app.models.interview import Interview, InterviewPanelist
from app.models.scorecard import Scorecard
from app.models.offer import Offer
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.utils.permissions import (
    UserRole, JobStatus, ApplicationStage,
    InterviewType, InterviewStatus, OfferStatus,
)
from app.utils.security import hash_password
import app.models  # noqa — register all models

engine = create_async_engine(settings.database_url)
Session = async_sessionmaker(engine, expire_on_commit=False)

NOW = datetime.now(timezone.utc)


def ago(**kwargs):
    return NOW - timedelta(**kwargs)


def future(**kwargs):
    return NOW + timedelta(**kwargs)


async def clear_all(db: AsyncSession):
    tables = [
        "candidate_invitations", "password_reset_tokens",
        "audit_logs", "notifications", "scorecards", "offers",
        "interview_panelists", "interviews",
        "applications", "candidates",
        "refresh_tokens", "jobs", "users", "organizations",
    ]
    for t in tables:
        await db.execute(text(
            f"DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE tablename = '{t}') "
            f"THEN TRUNCATE TABLE \"{t}\" CASCADE; END IF; END $$;"
        ))
    await db.commit()
    print("--  Cleared all tables")


async def seed():
    async with Session() as db:
        # Check if admin already exists
        result = await db.execute(select(User).where(User.email == "admin@brainerhub.com"))
        existing_admin = result.scalar_one_or_none()
        
        if existing_admin:
            print("\n⏩  Database already seeded. Skipping truncation and seeding.\n")
            return

        print("\n🌱 HireOn — Seeding full demo data...\n")
        await clear_all(db)

        # ── Organization ──────────────────────────────────────────────────────
        org = Organization(
            name="Brainerhub",
            slug="brainerhub",
            industry="Technology",
            size="51-200",
            website="https://brainerhub.com",
            description="Brainerhub builds next-generation developer tooling used by 10,000+ engineers worldwide.",
            is_active=True,
        )
        db.add(org)
        await db.flush()
        print(f"  ✓ Organization: {org.name}")

        # ── Users ─────────────────────────────────────────────────────────────
        admin = User(
            organization_id=org.id,
            email="admin@brainerhub.com",
            full_name="Admin",
            hashed_password=hash_password("password123"),
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
            last_login=ago(hours=2),
        )
        recruiter = User(
            organization_id=org.id,
            email="recruiter@brainerhub.com",
            full_name="Bob Recruiter",
            hashed_password=hash_password("password123"),
            role=UserRole.RECRUITER,
            is_active=True,
            is_verified=True,
            last_login=ago(minutes=30),
        )
        recruiter2 = User(
            organization_id=org.id,
            email="recruiter2@brainerhub.com",
            full_name="Sneha HR",
            hashed_password=hash_password("password123"),
            role=UserRole.RECRUITER,
            is_active=True,
            is_verified=True,
            last_login=ago(hours=1),
        )
        interviewer = User(
            organization_id=org.id,
            email="interviewer@brainerhub.com",
            full_name="Carol Interviewer",
            hashed_password=hash_password("password123"),
            role=UserRole.INTERVIEWER,
            is_active=True,
            is_verified=True,
            last_login=ago(days=1),
        )
        interviewer2 = User(
            organization_id=org.id,
            email="interviewer2@brainerhub.com",
            full_name="Dan Techie",
            hashed_password=hash_password("password123"),
            role=UserRole.INTERVIEWER,
            is_active=True,
            is_verified=True,
            last_login=ago(days=2),
        )
        candidate_user = User(
            organization_id=org.id,
            email="sarah.chen@gmail.com",
            full_name="Sarah Chen",
            hashed_password=hash_password("password123"),
            role=UserRole.CANDIDATE,
            is_active=True,
            is_verified=True,
            last_login=ago(days=1),
        )
        for u in [admin, recruiter, recruiter2, interviewer, interviewer2, candidate_user]:
            db.add(u)
        await db.flush()
        await db.commit()
        print(f"  ✓ Users: 6 created (admin, 2 recruiters, 2 interviewers, 1 candidate)")

        print("\n" + "=" * 55)
        print("✅  Seed complete! Users loaded.")
        print("=" * 55)
        print("\n🔐 Login Credentials:")
        print("  Admin:        admin@brainerhub.com    / password123")
        print("  HR Recruiter: recruiter@brainerhub.com   / password123")
        print("  HR Recruiter: recruiter2@brainerhub.com     / password123")
        print("  Interviewer:  interviewer@brainerhub.com  / password123")
        print("  Interviewer2: interviewer2@brainerhub.com   / password123")
        print("  Candidate:    sarah.chen@gmail.com    / password123")
        print("=" * 55 + "\n")


if __name__ == "__main__":
    asyncio.run(seed())
