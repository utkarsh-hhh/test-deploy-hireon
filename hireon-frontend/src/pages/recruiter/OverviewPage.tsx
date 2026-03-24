import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/api/analytics'
import { notificationsApi } from '@/api/notifications'
import { interviewsApi } from '@/api/interviews'
import { useAuthStore } from '@/store/authStore'
import { Skeleton } from '@/components/ui/Skeleton'
import React from 'react'
import { formatDistanceToNow, isToday, format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { RecentActivityFeed } from '@/components/common/RecentActivityFeed'

// ─── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  icon: string
  label: string
  value: string | number
  delta?: { label: string; up: boolean }
}

function KpiCard({ icon, label, value, delta }: KpiCardProps) {
  return (
    <div
      className="rounded-[20px] p-6 transition-all duration-300"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--shadow)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-[22px]">{icon}</span>
        {delta && (
          <span
            className="text-[11px] font-bold px-2 py-[3px] rounded-full"
            style={{
              background: delta.up ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: delta.up ? '#10b981' : '#ef4444',
            }}
          >
            {delta.label}
          </span>
        )}
      </div>
      <p
        className="font-black leading-none mb-1.5"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '36px', color: 'var(--text)', letterSpacing: '-1px' }}
      >
        {value}
      </p>
      <p className="text-[12px] font-semibold" style={{ color: 'var(--text-mid)' }}>{label}</p>
    </div>
  )
}

// ─── Funnel Row ────────────────────────────────────────────────────────────────
function FunnelRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-4 mb-4 last:mb-0">
      <span className="text-[12px] font-semibold w-24 text-right flex-shrink-0" style={{ color: 'var(--text-mid)' }}>
        {label}
      </span>
      <div className="flex-1 h-[10px] rounded-full overflow-hidden" style={{ background: 'rgba(108, 71, 255, 0.05)' }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 w-24 justify-end">
        <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{count.toLocaleString()}</span>
      </div>
    </div>
  )
}

// ─── Activity Item ─────────────────────────────────────────────────────────────
interface ActivityItemProps {
  icon: string
  title: string
  sub: string
  time: string
  iconBg: string
}

function ActivityItem({ icon, title, sub, time, iconBg }: ActivityItemProps) {
  return (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 border-b last:border-0" style={{ borderColor: 'rgba(108, 71, 255, 0.05)' }}>
      <div
        className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[16px] flex-shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold truncate text-[var(--text)]">{title}</p>
        <p className="text-[11px] font-medium truncate text-[var(--text-light)]">{sub}</p>
      </div>
      <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: '#c4b9de' }}>{time}</span>
    </div>
  )
}

// ─── Interview Card ────────────────────────────────────────────────────────────
function InterviewCard({ time, name, type, status, meetingLink }: { time: string; name: string; type: string; status: 'confirmed' | 'pending'; meetingLink?: string | null }) {
  const isConfirmed = status === 'confirmed'
  return (
    <div
      className="p-5 rounded-[20px] transition-all duration-300 min-w-[280px] flex-1"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6c47ff' }}>{time}</p>
        {isConfirmed && meetingLink && (
          <a
            href={meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
            style={{ 
              background: 'linear-gradient(135deg, #6c47ff, #8b5cf6)', 
              color: '#fff',
              boxShadow: '0 4px 12px rgba(108, 71, 255, 0.2)'
            }}
          >
            Join Now
          </a>
        )}
      </div>
      <p className="text-[15px] font-black mb-1 text-[var(--text)]">{name}</p>
      <p className="text-[11px] font-medium mb-4 text-[var(--text-light)]">{type}</p>
      <div className="flex items-center gap-2">
        <div
          className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5`}
          style={{
            background: isConfirmed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)',
            color: isConfirmed ? '#10b981' : '#f59e0b',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: isConfirmed ? '#10b981' : '#f59e0b' }} />
          {isConfirmed ? 'Confirmed' : 'Pending'}
        </div>
      </div>
    </div>
  )
}

// ─── Quick Link ────────────────────────────────────────────────────────────────
function QuickLink({ label, icon, onClick, bg }: { label: string; icon: string; onClick: () => void; bg: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-[20px] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg text-left"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-[18px]" style={{ background: bg }}>
        {icon}
      </div>
      <span className="text-[13px] font-bold text-[var(--text)]">{label}</span>
      <span className="ml-auto text-[14px]" style={{ color: '#c4b9de' }}>→</span>
    </button>
  )
}

const NOTIFICATION_MAP: Record<string, { icon: string; bg: string }> = {
  application_received: { icon: '💬', bg: 'rgba(255, 107, 198, 0.1)' },
  stage_changed: { icon: '✅', bg: 'rgba(16, 185, 129, 0.1)' },
  interview_scheduled: { icon: '📅', bg: 'rgba(108, 71, 255, 0.1)' },
  interview_reminder: { icon: '⏰', bg: 'rgba(108, 71, 255, 0.1)' },
  scorecard_submitted: { icon: '🧠', bg: 'rgba(139, 92, 246, 0.1)' },
  offer_sent: { icon: '📨', bg: 'rgba(251, 191, 36, 0.1)' },
  offer_accepted: { icon: '🎉', bg: 'rgba(10, 185, 129, 0.1)' },
  default: { icon: '🔔', bg: 'rgba(108, 71, 255, 0.1)' },
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.overview().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['recent-activities-legacy'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: interviews, isLoading: interviewsLoading } = useQuery({
    queryKey: ['interviews', 'today'],
    queryFn: () => interviewsApi.list().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const todayInterviews = interviews?.filter(i => isToday(new Date(i.scheduled_at))) || []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const kpis = [
    { label: 'Resumes Processed', value: analytics?.total_applications ?? 0, icon: '📥', delta: { label: '↑ 18%', up: true } },
    { label: 'Auto-Shortlisted', value: analytics?.total_candidates ?? 0, icon: '✅', delta: { label: '↑ 12%', up: true } },
    { label: 'Interviews Booked', value: analytics?.interviews_scheduled ?? 0, icon: '📅', delta: { label: '↑ 7%', up: true } },
    { label: 'Hires Made', value: analytics?.offers_accepted ?? 0, icon: '🎉', delta: { label: '2', up: true } },
  ]

  const funnelTotal = analytics?.total_applications ?? 1

  return (
    <div className="w-full space-y-8 pb-10 pt-6">
      {/* Header Section */}
      <div className="mb-4">
        <h1
          className="font-black mb-2 tracking-[-1px] text-[32px] md:text-[40px] leading-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--text)' }}
        >
          {greeting}, {user?.full_name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-[16px] font-medium" style={{ color: 'var(--text-mid)' }}>
          Here's your hiring pipeline at a glance — Hireon AI is working 24/7.
        </p>
      </div>

      {/* Quick Links Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickLink
          label="Post New Job"
          icon="💼"
          bg="rgba(108, 71, 255, 0.1)"
          onClick={() => navigate('/recruiter/jobs/new')}
        />
        <QuickLink
          label="Add Candidate"
          icon="👥"
          bg="rgba(16, 185, 129, 0.1)"
          onClick={() => navigate('/recruiter/upload')}
        />
        <QuickLink
          label="Schedule Call"
          icon="📅"
          bg="rgba(255, 107, 198, 0.1)"
          onClick={() => navigate('/recruiter/interviews')}
        />
        <QuickLink
          label="AI Analytics"
          icon="🧠"
          bg="rgba(139, 92, 246, 0.1)"
          onClick={() => navigate('/recruiter/analytics')}
        />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {analyticsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] rounded-[20px]" />
          ))
        ) : (
          kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hiring Funnel */}
        <div
          className="rounded-[24px] p-8"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[16px] font-black text-[var(--text)]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Hiring Funnel
            </h3>
            <span className="text-[10px] font-bold px-2 py-1 rounded-[6px] uppercase tracking-wider" style={{ background: 'rgba(108, 71, 255, 0.08)', color: '#6c47ff' }}>
              This Month
            </span>
          </div>

          <div className="space-y-6">
            <FunnelRow label="Applied" count={analytics?.total_applications ?? 0} total={funnelTotal} color="#6c47ff" />
            <FunnelRow label="Shortlisted" count={analytics?.total_candidates ?? 0} total={funnelTotal} color="#ff6bc6" />
            <FunnelRow label="Interviewed" count={analytics?.interviews_scheduled ?? 0} total={funnelTotal} color="#ff6bc6" />
            <FunnelRow label="Hired" count={analytics?.offers_accepted ?? 0} total={funnelTotal} color="#00d4c8" />
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="rounded-[24px] p-8"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[16px] font-black text-[var(--text)]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Recent Activity
            </h3>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#10b981] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              Live
            </span>
          </div>

          <div className="space-y-1">
            <RecentActivityFeed limit={4} />
          </div>
        </div>
      </div>

      {/* Today's Interviews Section */}
      <div
        className="rounded-[24px] p-8"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h3 className="text-[16px] font-black text-[var(--text)]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Today's Interviews
            </h3>
            <span className="text-[10px] font-bold px-2 py-1 rounded-[6px] " style={{ background: 'rgba(108, 71, 255, 0.08)', color: '#6c47ff' }}>
              {format(new Date(), 'MMM dd')}
            </span>
          </div>
          <button
            onClick={() => navigate('/recruiter/interviews')}
            className="text-[11px] font-bold"
            style={{ color: '#6c47ff' }}
          >
            View Schedule →
          </button>
        </div>

        {interviewsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-[20px]" />
            ))}
          </div>
        ) : todayInterviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {todayInterviews.map((int) => (
              <InterviewCard
                key={int.id}
                time={format(new Date(int.scheduled_at), 'hh:mm a')}
                name={int.candidate_name || 'Anonymous Candidate'}
                type={int.interview_type}
                status={int.status === 'scheduled' ? 'confirmed' : 'pending'}
                meetingLink={int.meeting_link}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-[var(--sb-active)] dark:bg-[rgba(108,71,255,0.05)] rounded-[20px] border border-dashed border-[var(--sidebar-border)]">
            <span className="text-2xl mb-2 block">📅</span>
            <p className="text-[13px] font-medium text-[var(--text-mid)]">No interviews scheduled for today.</p>
          </div>
        )}
      </div>
    </div>
  )
}
