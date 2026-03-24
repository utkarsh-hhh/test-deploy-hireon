import { format, formatDistanceToNow } from 'date-fns'

// Helper to ensure dates from API are treated as UTC if they lack a timezone
function safeParseDate(date: string | null | undefined): Date | null {
  if (!date) return null
  const cleaned = date.includes('T') ? date : date.replace(' ', 'T')
  const withZ = (cleaned.endsWith('Z') || cleaned.includes('+')) ? cleaned : cleaned + 'Z'
  const d = new Date(withZ)
  return isNaN(d.getTime()) ? new Date(date) : d
}

export function formatDate(date: string | null | undefined, fmt = 'MMM d, yyyy'): string {
  const d = safeParseDate(date)
  if (!d) return '—'
  return format(d, fmt)
}

export function formatDateTime(date: string | null | undefined): string {
  const d = safeParseDate(date)
  if (!d) return '—'
  return format(d, 'MMM d, yyyy h:mm a')
}

export function timeAgo(date: string | null | undefined): string {
  const d = safeParseDate(date)
  if (!d) return '—'
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatSalary(min?: number | null, max?: number | null, currency = 'USD'): string {
  if (!min && !max) return '—'
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  return `Up to ${fmt(max!)}`
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return '—'
  return `${Math.round(score)}%`
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-gray-400'
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

export function stageLabel(stage: string): string {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

export function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}
