"""initial schema - create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2026-03-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── organizations ──────────────────────────────────────────────────────
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('website', sa.String(255), nullable=True),
        sa.Column('industry', sa.String(100), nullable=True),
        sa.Column('size', sa.String(50), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('timezone', sa.String(50), nullable=False, server_default='Asia/Kolkata'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_organizations_slug', 'organizations', ['slug'], unique=True)

    # ── users ──────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, server_default='recruiter'),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('google_refresh_token', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_organization_id', 'users', ['organization_id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # ── refresh_tokens ─────────────────────────────────────────────────────
    op.create_table(
        'refresh_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token', sa.String(500), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_revoked', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])
    op.create_index('ix_refresh_tokens_token', 'refresh_tokens', ['token'], unique=True)

    # ── password_reset_tokens ──────────────────────────────────────────────
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token', sa.String(128), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'])
    op.create_index('ix_password_reset_tokens_token', 'password_reset_tokens', ['token'], unique=True)

    # ── jobs ────────────────────────────────────────────────────────────────
    op.create_table(
        'jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('job_type', sa.String(50), nullable=False, server_default='full_time'),
        sa.Column('experience_level', sa.String(50), nullable=True),
        sa.Column('min_experience_years', sa.Integer, nullable=True, server_default='0'),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('requirements', sa.Text, nullable=True),
        sa.Column('responsibilities', sa.Text, nullable=True),
        sa.Column('benefits', sa.Text, nullable=True),
        sa.Column('skills_required', postgresql.ARRAY(sa.String), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('is_remote', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('jd_url', sa.String(500), nullable=True),
        sa.Column('jd_filename', sa.String(255), nullable=True),
        sa.Column('application_deadline', sa.DateTime(timezone=True), nullable=True),
        sa.Column('openings', sa.Integer, nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_jobs_organization_id', 'jobs', ['organization_id'])

    # ── candidates ──────────────────────────────────────────────────────────
    op.create_table(
        'candidates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('linkedin_url', sa.String(500), nullable=True),
        sa.Column('portfolio_url', sa.String(500), nullable=True),
        sa.Column('github_url', sa.String(500), nullable=True),
        sa.Column('resume_url', sa.String(500), nullable=True),
        sa.Column('resume_filename', sa.String(255), nullable=True),
        sa.Column('parsed_data', postgresql.JSONB, nullable=True),
        sa.Column('skills', postgresql.ARRAY(sa.String), nullable=True),
        sa.Column('years_experience', sa.Integer, nullable=True),
        sa.Column('current_title', sa.String(255), nullable=True),
        sa.Column('current_company', sa.String(255), nullable=True),
        sa.Column('summary', sa.Text, nullable=True),
        sa.Column('match_score', sa.Float, nullable=True),
        sa.Column('score_breakdown', postgresql.JSONB, nullable=True),
        sa.Column('pipeline_stage', sa.String(50), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String), nullable=True),
        sa.Column('source', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_candidates_organization_id', 'candidates', ['organization_id'])
    op.create_index('ix_candidates_email', 'candidates', ['email'])

    # ── applications ────────────────────────────────────────────────────────
    op.create_table(
        'applications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('job_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('candidates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stage', sa.String(50), nullable=False, server_default='applied'),
        sa.Column('match_score', sa.Float, nullable=True),
        sa.Column('recruiter_notes', sa.Text, nullable=True),
        sa.Column('rejection_reason', sa.Text, nullable=True),
        sa.Column('source', sa.String(100), nullable=True),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('stage_changed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_applications_organization_id', 'applications', ['organization_id'])
    op.create_index('ix_applications_job_id', 'applications', ['job_id'])
    op.create_index('ix_applications_candidate_id', 'applications', ['candidate_id'])
    op.create_index('ix_applications_stage', 'applications', ['stage'])

    # ── interviews ──────────────────────────────────────────────────────────
    op.create_table(
        'interviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('candidates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('application_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('applications.id', ondelete='SET NULL'), nullable=True),
        sa.Column('scheduled_by_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('interview_type', sa.String(50), nullable=False, server_default='video'),
        sa.Column('status', sa.String(50), nullable=False, server_default='scheduled'),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_minutes', sa.Integer, nullable=False, server_default='60'),
        sa.Column('meeting_link', sa.String(500), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('calendar_event_id', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('feedback', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_interviews_organization_id', 'interviews', ['organization_id'])
    op.create_index('ix_interviews_candidate_id', 'interviews', ['candidate_id'])
    op.create_index('ix_interviews_application_id', 'interviews', ['application_id'])
    op.create_index('ix_interviews_status', 'interviews', ['status'])

    # ── interview_panelists ─────────────────────────────────────────────────
    op.create_table(
        'interview_panelists',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('interview_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('interviews.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(100), nullable=True),
    )
    op.create_index('ix_interview_panelists_interview_id', 'interview_panelists', ['interview_id'])

    # ── scorecards ──────────────────────────────────────────────────────────
    op.create_table(
        'scorecards',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('interview_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('interviews.id', ondelete='CASCADE'), nullable=False),
        sa.Column('application_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('applications.id', ondelete='SET NULL'), nullable=True),
        sa.Column('submitted_by_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('overall_rating', sa.Integer, nullable=False),
        sa.Column('recommendation', sa.String(50), nullable=False),
        sa.Column('criteria_scores', postgresql.JSONB, nullable=True),
        sa.Column('strengths', sa.Text, nullable=True),
        sa.Column('weaknesses', sa.Text, nullable=True),
        sa.Column('summary', sa.Text, nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_scorecards_organization_id', 'scorecards', ['organization_id'])
    op.create_index('ix_scorecards_interview_id', 'scorecards', ['interview_id'])
    op.create_index('ix_scorecards_application_id', 'scorecards', ['application_id'])

    # ── offers ──────────────────────────────────────────────────────────────
    op.create_table(
        'offers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('application_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('applications.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='draft'),
        sa.Column('base_salary', sa.Float, nullable=False),
        sa.Column('salary_currency', sa.String(10), nullable=False, server_default='USD'),
        sa.Column('bonus', sa.Float, nullable=True),
        sa.Column('equity', sa.String(100), nullable=True),
        sa.Column('benefits', sa.Text, nullable=True),
        sa.Column('position_title', sa.String(255), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expiry_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('letter_content', sa.Text, nullable=True),
        sa.Column('pdf_url', sa.String(500), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('decline_reason', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_offers_organization_id', 'offers', ['organization_id'])
    op.create_index('ix_offers_status', 'offers', ['status'])

    # ── notifications ───────────────────────────────────────────────────────
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(100), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('data', postgresql.JSONB, nullable=True),
        sa.Column('is_read', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_notifications_organization_id', 'notifications', ['organization_id'])
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])

    # ── audit_logs ──────────────────────────────────────────────────────────
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(100), nullable=False),
        sa.Column('resource_id', sa.String(255), nullable=True),
        sa.Column('details', postgresql.JSONB, nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_audit_logs_organization_id', 'audit_logs', ['organization_id'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])

    # ── candidate_invitations ───────────────────────────────────────────────
    op.create_table(
        'candidate_invitations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('candidates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('token', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_candidate_invitations_organization_id', 'candidate_invitations', ['organization_id'])
    op.create_index('ix_candidate_invitations_candidate_id', 'candidate_invitations', ['candidate_id'])
    op.create_index('ix_candidate_invitations_token', 'candidate_invitations', ['token'], unique=True)


def downgrade() -> None:
    op.drop_table('candidate_invitations')
    op.drop_table('audit_logs')
    op.drop_table('notifications')
    op.drop_table('offers')
    op.drop_table('scorecards')
    op.drop_table('interview_panelists')
    op.drop_table('interviews')
    op.drop_table('applications')
    op.drop_table('candidates')
    op.drop_table('jobs')
    op.drop_table('password_reset_tokens')
    op.drop_table('refresh_tokens')
    op.drop_table('users')
    op.drop_table('organizations')
