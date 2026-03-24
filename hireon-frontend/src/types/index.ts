// ── Enums ──────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'recruiter' | 'interviewer' | 'candidate'

export type JobStatus = 'draft' | 'active' | 'paused' | 'closed'

export type ApplicationStage =
  | 'applied'
  | 'screening'
  | 'pre_screening'
  | 'technical_round'
  | 'practical_round'
  | 'techno_functional_round'
  | 'management_round'
  | 'hr_round'
  | 'interview'
  | 'interviewed'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'inactive'
  | 'needs_review'

export type InterviewType = 'phone' | 'video' | 'onsite' | 'technical' | 'hr' | 'final'

export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'revoked'

export type NotificationType =
  | 'application_received'
  | 'stage_changed'
  | 'interview_scheduled'
  | 'interview_reminder'
  | 'scorecard_submitted'
  | 'offer_sent'
  | 'offer_accepted'
  | 'offer_declined'
  | 'system'

// ── Core Models ────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  organization_id: string
  avatar_url: string | null
  is_active: boolean
  is_calendar_connected: boolean
}

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  website: string | null
  industry: string | null
  size: string | null
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Job {
  id: string
  organization_id: string
  title: string
  department: string | null
  location: string | null
  job_type: string
  experience_level: string | null
  min_experience_years?: number | null
  description: string
  requirements: string | null
  responsibilities: string | null
  benefits: string | null
  skills_required: string[]
  status: JobStatus
  is_remote: boolean
  application_deadline: string | null
  openings: number
  jd_url?: string | null
  jd_filename?: string | null
  created_at: string
  updated_at: string
  application_count: number
}

export interface Candidate {
  id: string
  organization_id: string
  email: string
  full_name: string
  phone: string | null
  location: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  github_url: string | null
  resume_url: string | null
  resume_filename: string | null
  avatar_url: string | null
  parsed_data: Record<string, unknown> | null
  score_breakdown: {
    final_score: number
    skills_score: number
    title_score: number
    experience_score: number
    education_score: number
    matched_skills: string[]
    missing_skills: string[]
    shortlisted: boolean
    reasoning: string
  } | null
  skills: string[]
  years_experience: number | null
  current_title: string | null
  current_company: string | null
  summary: string | null
  match_score: number | null
  source: string | null
  pipeline_stage?: ApplicationStage | null
  applied_job_title?: string | null
  created_at: string
  updated_at: string
  invitations: Invitation[]
  tags: string[]
  experience_years?: number | null
  notice_period_days?: number | null
  current_ctc?: number | null
  expected_ctc?: number | null
  work_mode_preference?: string | null
  availability_status?: string | null
  interview_availability_days?: string[] | null
  interview_time_slot?: string | null
  hr_notes?: string | null
}

export interface Invitation {
  id: string
  email: string
  token: string
  expires_at: string
  is_used: boolean
  created_at: string
}

export interface Application {
  id: string
  organization_id: string
  job_id: string
  candidate_id: string
  stage: ApplicationStage
  match_score: number | null
  recruiter_notes: string | null
  rejection_reason: string | null
  source: string | null
  applied_at: string
  stage_changed_at: string
  created_at: string
  candidate?: Candidate
  job?: Job
}

export interface Panelist {
  id: string
  user_id: string
  role: string | null
  user_name: string | null
  user_email: string | null
}

export interface Interview {
  id: string
  organization_id: string
  candidate_id: string
  application_id: string | null
  candidate_name?: string
  candidate_email?: string
  title: string
  interview_type: InterviewType
  status: InterviewStatus
  scheduled_at: string
  duration_minutes: number
  meeting_link: string | null
  location: string | null
  notes: string | null
  feedback: string | null
  is_confirmed: boolean
  candidate_skills?: string[]
  panelists: Panelist[]
  created_at: string
  updated_at: string
}

export interface CriterionScore {
  criterion: string
  score: number
  notes: string | null
}

export interface Scorecard {
  id: string
  organization_id: string
  interview_id: string
  application_id: string
  submitted_by_id: string
  overall_rating: number
  recommendation: string
  criteria_scores: CriterionScore[] | null
  strengths: string | null
  weaknesses: string | null
  summary: string | null
  submitted_at: string
  submitted_by_name: string | null
}

export interface Offer {
  id: string
  organization_id: string
  application_id: string
  status: OfferStatus
  base_salary: number
  salary_currency: string
  bonus: number | null
  equity: string | null
  benefits: string | null
  position_title: string
  department: string | null
  start_date: string | null
  expiry_date: string | null
  letter_content: string | null
  pdf_url: string | null
  sent_at: string | null
  responded_at: string | null
  decline_reason: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  organization_id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown> | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  user_id: string | null
  user_name: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  total_jobs: number
  active_jobs: number
  total_applications: number
  total_candidates: number
  interviews_scheduled: number
  offers_sent: number
  offers_accepted: number
  avg_match_score: number | null
  time_to_hire_days: number | null
}

export interface FunnelStage {
  stage: ApplicationStage
  count: number
  percentage: number
}

export interface FunnelData {
  job_id: string | null
  stages: FunnelStage[]
}

export interface ScoreDistributionBucket {
  range: string
  count: number
}

export interface InterviewerPerformance {
  interviewer_id: string
  interviewer_name: string
  interviews_conducted: number
  avg_rating_given: number | null
  scorecards_submitted: number
}

// ── API Response Wrappers ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

// ── Pipeline (Kanban) ──────────────────────────────────────────────────────────

export interface KanbanCard {
  id: string
  candidate_name: string
  candidate_email: string
  avatar_url: string | null
  match_score: number | null
  applied_at: string
  stage_changed_at: string
  recruiter_notes: string | null
  skills: string[]
  current_title: string | null
  application_id: string
}

export interface PipelineData {
  stages: Partial<Record<ApplicationStage, KanbanCard[]>>
}

// ── Forms ──────────────────────────────────────────────────────────────────────

export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  full_name: string
  email: string
  password: string
  organization_name: string
  organization_slug: string
}

export interface JobForm {
  title: string
  location: string
  job_type: string
  experience_level: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  description: string
  requirements: string
  skills_required: string[]
  is_remote: boolean
  openings: number
  status: JobStatus
}
