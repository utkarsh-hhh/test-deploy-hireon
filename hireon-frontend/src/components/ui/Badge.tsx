import { clsx } from 'clsx'
import type { ApplicationStage, JobStatus, InterviewStatus, OfferStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'teal' | 'pink'
  size?: 'sm' | 'md'
  className?: string
}

const variants = {
  default: 'bg-[rgba(107,114,128,0.10)] text-[#6b7280]',
  success: 'bg-[rgba(16,185,129,0.12)] text-[#059669]',
  warning: 'bg-[rgba(251,191,36,0.12)] text-[#d97706]',
  danger:  'bg-[rgba(239,68,68,0.10)] text-[#ef4444]',
  info:    'bg-[rgba(59,130,246,0.12)] text-[#1d4ed8]',
  purple:  'bg-[rgba(108,71,255,0.12)] text-[#6c47ff]',
  teal:    'bg-[rgba(0,212,200,0.10)] text-[#00d4c8]',
  pink:    'bg-[rgba(255,107,198,0.10)] text-[#ff6bc6]',
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-bold rounded-full',
        size === 'sm' ? 'px-[10px] py-[3px] text-[10px]' : 'px-3 py-1 text-[12px]',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// Score badge: green >= 80, yellow >= 60, violet otherwise
export function ScoreBadge({ score }: { score: number }) {
  const variant =
    score >= 80 ? 'success' :
    score >= 60 ? 'warning' :
    'purple'
  return <Badge variant={variant}>{score}%</Badge>
}

// Stage badge with automatic color
export function StageBadge({ stage }: { stage: ApplicationStage }) {
  const map: Record<ApplicationStage, BadgeProps['variant']> = {
    applied:   'purple',
    screening: 'info',
    pre_screening: 'info',
    technical_round: 'purple',
    practical_round: 'purple',
    techno_functional_round: 'purple',
    management_round: 'purple',
    hr_round: 'purple',
    interview:   'purple',
    interviewed: 'purple',
    offer:       'warning',
    hired:     'success',
    rejected:     'danger',
    inactive:     'default',
    needs_review: 'info',
  }
  return (
    <Badge variant={map[stage]}>
      {stage.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </Badge>
  )
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, BadgeProps['variant']> = {
    active: 'success', draft: 'default', paused: 'warning', closed: 'danger',
  }
  return <Badge variant={map[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
}

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const map: Record<OfferStatus, BadgeProps['variant']> = {
    draft: 'default', sent: 'info', accepted: 'success',
    declined: 'danger', expired: 'warning', revoked: 'danger',
  }
  return <Badge variant={map[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
}
