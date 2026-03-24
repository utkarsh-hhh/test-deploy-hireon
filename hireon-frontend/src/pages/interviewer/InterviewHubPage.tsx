import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { interviewsApi } from '@/api/interviews'
import type { Interview, InterviewStatus } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/utils/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────

export type HubMode = 'scorecard' | 'prepkit' | 'liveroom'

function statusVariant(s: InterviewStatus): 'info' | 'success' | 'danger' | 'warning' {
  return { scheduled: 'info', completed: 'success', cancelled: 'danger', no_show: 'warning' }[s] as 'info' | 'success' | 'danger' | 'warning'
}

interface ModeConfig {
  icon: string
  title: string
  subtitle: string
  filter: (i: Interview) => boolean
  accentColor: string
  accentBg: string
  ctaLabel: (i: Interview) => string
  ctaPath: (id: string) => string
  ctaBg: string
  emptyTitle: string
  emptyDesc: string
}

const MODE: Record<HubMode, ModeConfig> = {
  scorecard: {
    icon: '📊',
    title: 'Scorecard & Eval',
    subtitle: 'Select an interview to submit or review your evaluation',
    filter: () => true,
    accentColor: '#6c47ff',
    accentBg: 'rgba(108,71,255,0.09)',
    ctaLabel: (i) => i.status === 'completed' ? 'View Scorecard' : '📊 Submit Scorecard',
    ctaPath: (id) => `/interviewer/scorecard/${id}`,
    ctaBg: 'linear-gradient(135deg, #6c47ff, #8b6bff)',
    emptyTitle: 'No interviews assigned yet',
    emptyDesc: 'Interviews assigned to you will appear here',
  },
  prepkit: {
    icon: '🗒️',
    title: 'Prep Kit',
    subtitle: 'Open AI-generated questions tailored to the candidate\'s resume',
    filter: (i) => i.status === 'scheduled',
    accentColor: '#f59e0b',
    accentBg: 'rgba(245,158,11,0.09)',
    ctaLabel: () => '🗒️ Open Prep Kit',
    ctaPath: (id) => `/interviewer/prep-kit/${id}`,
    ctaBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    emptyTitle: 'No upcoming interviews',
    emptyDesc: 'Scheduled interviews will show prep kits here',
  },
  liveroom: {
    icon: '🟢',
    title: 'Live Room',
    subtitle: 'Enter the live interview room — track ratings, notes & meeting link',
    filter: (i) => i.status === 'scheduled',
    accentColor: '#10b981',
    accentBg: 'rgba(16,185,129,0.09)',
    ctaLabel: () => '🟢 Enter Live Room',
    ctaPath: (id) => `/interviewer/live-room/${id}`,
    ctaBg: 'linear-gradient(135deg, #10b981, #059669)',
    emptyTitle: 'No scheduled interviews',
    emptyDesc: 'Scheduled interviews will appear here for live sessions',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InterviewHubPage({ mode }: { mode: HubMode }) {
  const navigate = useNavigate()
  const cfg = MODE[mode]

  const { data: interviews, isLoading, isError } = useQuery({
    queryKey: ['my-interviews'],
    queryFn: () => interviewsApi.list().then((r) => r.data),
  })

  const filtered = interviews?.filter(cfg.filter).sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  ) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        {/* Feature banner */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 20,
          background: cfg.accentBg,
          border: `1px solid ${cfg.accentColor}22`,
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 16 }}>{cfg.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.accentColor, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            {cfg.title}
          </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: "'Fraunces', serif" }}>
          Pick an Interview
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 4 }}>
          {cfg.subtitle}
        </p>
      </motion.div>

      {/* ── Count pill ──────────────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
            background: cfg.accentBg, color: cfg.accentColor,
            border: `1px solid ${cfg.accentColor}22`,
          }}>
            {filtered.length} interview{filtered.length !== 1 ? 's' : ''}
          </span>
          {mode === 'scorecard' && (
            <span style={{ fontSize: 12, color: 'var(--text-lite)' }}>
              · all statuses shown
            </span>
          )}
          {(mode === 'prepkit' || mode === 'liveroom') && (
            <span style={{ fontSize: 12, color: 'var(--text-lite)' }}>
              · upcoming only
            </span>
          )}
        </div>
      )}

      {/* ── List ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px',
              borderRadius: 14, border: '1px solid var(--card-border)',
            }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)',
          borderRadius: 12, padding: '14px 18px', fontSize: 13,
          color: '#ef4444', fontWeight: 600,
        }}>
          Failed to load interviews. Please refresh.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          title={cfg.emptyTitle}
          description={cfg.emptyDesc}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((interview, i) => (
            <motion.div
              key={interview.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.045 }}
            >
              <Card
                hover
                style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
              >
                {/* Accent bar */}
                <div style={{
                  width: 4, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0,
                  background: `linear-gradient(180deg, ${cfg.accentColor}, ${cfg.accentColor}55)`,
                  minHeight: 48,
                }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                      {interview.title}
                    </span>
                    <Badge variant={statusVariant(interview.status)}>
                      {interview.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                    <Badge variant="default">
                      {interview.interview_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-mid)', flexWrap: 'wrap' }}>
                    <span>📅 {formatDateTime(interview.scheduled_at)}</span>
                    <span>⏱ {interview.duration_minutes} min</span>
                    {interview.meeting_link && (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>🎥 Meet link available</span>
                    )}
                    {interview.candidate_name && (
                      <span>👤 {interview.candidate_name}</span>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => navigate(cfg.ctaPath(interview.id))}
                  style={{
                    padding: '10px 18px', borderRadius: 10, border: 'none',
                    background: interview.status === 'completed' && mode === 'scorecard'
                      ? 'rgba(108,71,255,0.12)'
                      : cfg.ctaBg,
                    color: interview.status === 'completed' && mode === 'scorecard'
                      ? '#6c47ff'
                      : '#fff',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'Sora', sans-serif",
                    boxShadow: interview.status !== 'completed' || mode !== 'scorecard'
                      ? `0 4px 12px ${cfg.accentColor}33`
                      : 'none',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {cfg.ctaLabel(interview)}
                </button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
