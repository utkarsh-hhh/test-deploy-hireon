# Import all models so Alembic can detect them for migrations
from app.models.organization import Organization
from app.models.user import User, RefreshToken
from app.models.job import Job
from app.models.candidate import Candidate
from app.models.application import Application
from app.models.interview import Interview, InterviewPanelist
from app.models.scorecard import Scorecard
from app.models.offer import Offer
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.models.invitation import CandidateInvitation
from app.models.password_reset import PasswordResetToken
from app.models.other_offer import OtherOffer
from app.models.job_referral import JobReferral
from app.models.candidate_document import CandidateDocument

__all__ = [
    "Organization", "User", "RefreshToken", "Job", "Candidate",
    "Application", "Interview", "InterviewPanelist", "Scorecard",
    "Offer", "Notification", "AuditLog", "CandidateInvitation", "PasswordResetToken", 
    "OtherOffer", "JobReferral", "CandidateDocument"
]
