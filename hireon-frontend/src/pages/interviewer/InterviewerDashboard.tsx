import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { interviewsApi } from '@/api/interviews'
import type { Interview } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/store/authStore'

/* ── helpers ──────────────────────────────────────────────────────────── */
function isToday(dateStr: string) {
  const d = new Date(dateStr), n = new Date()
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}

function isThisMonth(dateStr: string) {
  const d = new Date(dateStr), n = new Date()
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}

function isLiveNow(i: Interview) {
  if (i.status !== 'scheduled') return false
  const start = new Date(i.scheduled_at).getTime()
  const end = start + (i.duration_minutes ?? 60) * 60 * 1000
  const now = Date.now()
  return now >= start - 5 * 60 * 1000 && now <= end
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = ['#6c47ff', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ff6bc6', '#8b5cf6']
function avatarColor(name?: string | null) {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

type ScheduleBadge = 'live' | 'upcoming' | 'unconfirmed' | 'fill' | 'done'

function getBadge(i: Interview): ScheduleBadge {
  if (isLiveNow(i)) return 'live'
  if (i.status === 'completed' && !i.feedback) return 'fill'
  if (i.status === 'completed') return 'done'
  if (i.status === 'scheduled' && !i.meeting_link) return 'unconfirmed'
  return 'upcoming'
}

function getSubtext(i: Interview, badge: ScheduleBadge) {
  const t = fmtTime(i.scheduled_at)
  if (badge === 'live') {
    const link = i.meeting_link ? ` · ${i.meeting_link.replace(/^https?:\/\//, '')}` : ''
    return `${t} · In Progress${link}`
  }
  if (badge === 'fill') return `${t} · Completed · Scorecard due`
  if (badge === 'done') return `${t} · Completed`
  if (badge === 'unconfirmed') return `${t} · Awaiting confirm`
  return `${t} · Confirmed`
}

/* ── badge chip ───────────────────────────────────────────────────────── */
function ScheduleBadgeChip({ badge }: { badge: ScheduleBadge }) {
  if (badge === 'live') return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
      borderRadius: 20, background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
      Live
    </span>
  )
  if (badge === 'upcoming') return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
      borderRadius: 20, background: '#ede9fe', color: '#7c3aed', fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
      Upcoming
    </span>
  )
  if (badge === 'unconfirmed') return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
      borderRadius: 20, background: '#fff7ed', color: '#ea580c', fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ea580c', display: 'inline-block' }} />
      Unconfirmed
    </span>
  )
  if (badge === 'fill') return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '5px 14px',
      borderRadius: 20, background: '#6c47ff', color: '#fff', fontSize: 11, fontWeight: 700,
    }}>
      Fill
    </span>
  )
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
      borderRadius: 20, background: '#f0fdf4', color: '#15803d', fontSize: 11, fontWeight: 700,
    }}>
      Done
    </span>
  )
}

/* ── stat icon box ────────────────────────────────────────────────────── */
function StatIcon({ emoji, bg }: { emoji: string; bg: string }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 10, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
    }}>
      {emoji}
    </div>
  )
}

/* ── main component ───────────────────────────────────────────────────── */
export default function InterviewerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const { data: interviews, isLoading } = useQuery({
    queryKey: ['my-interviews'],
    queryFn: () => interviewsApi.list().then((r) => r.data),
  })

  const todayScheduled  = interviews?.filter((i) => isToday(i.scheduled_at) && i.status === 'scheduled') ?? []
  const completedToday  = interviews?.filter((i) => isToday(i.scheduled_at) && i.status === 'completed') ?? []
  const scorecardsdue   = interviews?.filter((i) => i.status === 'completed' && !i.feedback) ?? []
  const totalMonth      = interviews?.filter((i) => isThisMonth(i.scheduled_at)) ?? []
  const liveNowCount    = interviews?.filter(isLiveNow).length ?? 0

  // Today's schedule sorted by time
  const todayItems = interviews
    ?.filter((i) => isToday(i.scheduled_at) && i.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    ?? []

  const STATS = [
    {
      label: 'Interviews Today', value: todayScheduled.length,
      badge: 'Today', badgeColor: '#16a34a', badgeBg: '#dcfce7',
      emoji: '📅', iconBg: '#e0e7ff',
    },
    {
      label: 'Scorecards Due', value: scorecardsdue.length,
      badge: 'Pending', badgeColor: '#7c3aed', badgeBg: '#ede9fe',
      emoji: '⏳', iconBg: '#fef3c7',
    },
    {
      label: 'Completed Today', value: completedToday.length,
      badge: 'Done', badgeColor: '#16a34a', badgeBg: '#dcfce7',
      emoji: '✅', iconBg: '#d1fae5',
    },
    {
      label: 'Total Interviews', value: totalMonth.length,
      badge: 'This month', badgeColor: '#16a34a', badgeBg: '#dcfce7',
      emoji: '📊', iconBg: '#fce7f3',
    },
  ]

  const QUICK_ACCESS = [
    {
      label: 'Prep Kit', sub: 'Questions & checklist', emoji: '🗒️',
      bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      onClick: () => navigate('/interviewer/prep-kit-hub'),
    },
    {
      label: 'Scorecard', sub: 'Rate candidates', emoji: '📊',
      bg: 'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 100%)',
      onClick: () => navigate('/interviewer/scorecard-hub'),
    },
    {
      label: 'Panel Collaboration', sub: 'Team discussion', emoji: '🤝',
      bg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
      onClick: () => navigate('/interviewer/interviews'),
    },
    {
      label: 'My Analytics', sub: 'Your performance', emoji: '📈',
      bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
      onClick: () => navigate('/interviewer/interviews'),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Greeting ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', fontFamily: "'Fraunces', serif", lineHeight: 1.2 }}>
          {getGreeting()}{user ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text)', marginTop: 6, fontWeight: 500 }}>
          {isLoading ? (
            <span style={{ color: 'var(--text-mid)' }}>Loading your schedule…</span>
          ) : (
            <>
              You have{' '}
              <strong>{todayScheduled.length} interview{todayScheduled.length !== 1 ? 's' : ''} today</strong>
              {liveNowCount > 0 && <>{' — '}{liveNowCount} live right now</>}
              {". Let's go! 🎯"}
            </>
          )}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 2 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </motion.div>

      {/* ── 4 Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              borderRadius: 16, padding: '18px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            {/* top row: icon + badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <StatIcon emoji={s.emoji} bg={s.iconBg} />
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: s.badgeBg, color: s.badgeColor,
              }}>
                {s.badge}
              </span>
            </div>
            {/* number */}
            <p style={{
              fontSize: 38, fontWeight: 900, color: 'var(--text)', lineHeight: 1,
              fontFamily: "'Fraunces', serif",
            }}>
              {isLoading ? '–' : s.value}
            </p>
            {/* label */}
            <p style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 6, fontWeight: 500 }}>
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── Schedule + Quick Access ───────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-5" style={{ alignItems: 'start' }}>

        {/* Today's Schedule */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 16, padding: '22px 22px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 18 }}>
            Today's Schedule — {todayLabel}
          </h2>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((n) => <Skeleton key={n} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : todayItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-lite)', fontSize: 13 }}>
              🎉 No interviews scheduled today
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todayItems.map((interview, idx) => {
                const badge = getBadge(interview)
                const sub = getSubtext(interview, badge)
                const name = interview.candidate_name || interview.title
                const color = avatarColor(name)
                return (
                  <motion.div
                    key={interview.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => navigate(`/interviewer/scorecard/${interview.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 12,
                      background: badge === 'live' ? 'rgba(22,163,74,0.04)' : 'transparent',
                      border: `1px solid ${badge === 'live' ? 'rgba(22,163,74,0.15)' : 'var(--card-border)'}`,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                  >
                    {/* avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: `${color}22`, color, fontSize: 13, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1.5px solid ${color}44`,
                    }}>
                      {initials(name)}
                    </div>
                    {/* text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 700, color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {interview.candidate_name
                          ? `${interview.candidate_name} — ${interview.title}`
                          : interview.title
                        }
                      </p>
                      <p style={{
                        fontSize: 11, color: 'var(--text-mid)', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {sub}
                      </p>
                    </div>
                    {/* badge */}
                    <ScheduleBadgeChip badge={badge} />
                  </motion.div>
                )
              })}
            </div>
          )}

          <button
            onClick={() => navigate('/interviewer/interviews')}
            style={{
              width: '100%', marginTop: 14, padding: '9px', borderRadius: 10,
              border: '1px dashed rgba(108,71,255,0.3)', background: 'none',
              color: '#6c47ff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            View All Interviews →
          </button>
        </div>

        {/* Quick Access */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 16, padding: '22px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 18 }}>
            Quick Access
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACCESS.map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={item.onClick}
                style={{
                  padding: '18px 16px', borderRadius: 14,
                  background: item.bg, border: '1px solid rgba(0,0,0,0.05)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'flex-start', gap: 10, textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 26 }}>{item.emoji}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-mid)', fontWeight: 400 }}>
                    {item.sub}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
