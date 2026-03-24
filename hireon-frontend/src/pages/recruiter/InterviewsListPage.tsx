import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { interviewsApi } from '@/api/interviews'
import { candidatesApi } from '@/api/candidates'
import { scorecardsApi } from '@/api/scorecards'
import { adminApi } from '@/api/admin'
import type { Interview, InterviewStatus, InterviewType, Candidate, Scorecard } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Avatar } from '@/components/ui/Avatar'
import { formatDateTime, formatDate } from '@/utils/formatters'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const STATUS_CONFIG: Record<InterviewStatus, { label: string; color: string; bg: string; border: string; variant: 'purple' | 'success' | 'warning' | 'danger' }> = {
  scheduled: { label: 'Scheduled', color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.25)', variant: 'purple' },
  completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', variant: 'success' },
  no_show: { label: 'No Show', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', variant: 'warning' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', variant: 'danger' },
} as const

const TYPE_ICONS: Record<string, string> = {
  phone: '📞', video: '🎥', technical: '💻', onsite: '🏢', hr: '👤', final: '🏆',
}

const REC_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  strong_yes: { label: 'Strong Hire', color: '#059669', bg: 'rgba(16,185,129,0.12)' },
  yes: { label: 'Hire', color: '#059669', bg: 'rgba(16,185,129,0.10)' },
  maybe: { label: 'Maybe', color: '#d97706', bg: 'rgba(251,191,36,0.12)' },
  no: { label: 'No Hire', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  strong_no: { label: 'Strong No', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

const INTERVIEW_TYPES = [
  { value: 'video', label: 'Video Call' },
  { value: 'technical', label: 'Technical' },
  { value: 'onsite', label: 'On-site' },
  { value: 'hr', label: 'HR Interview' },
  { value: 'final', label: 'Final Round' },
]

const SCHEDULE_TITLES = [
  { value: 'Technical Round', type: 'technical' },
  { value: 'Practical Round', type: 'technical' },
  { value: 'HR Round', type: 'hr' },
  { value: 'Management Round', type: 'hr' },
  { value: 'Techno-Functional Round', type: 'technical' },
  { value: 'Final Round', type: 'final' },
]

// ─── Utils ──────────────────────────────────────────────────────────────────

/** Parses an API ISO date string and ensures it's treated as UTC */
const parseISO = (iso: string) => {
  if (!iso) return new Date()
  // Clean up if the server sometimes sends space instead of T
  const cleaned = iso.includes('T') ? iso : iso.replace(' ', 'T')
  // Ensure the 'Z' suffix so browser knows it's UTC (preventing 4:30 AM local shift)
  const withZ = (cleaned.endsWith('Z') || cleaned.includes('+')) ? cleaned : cleaned + 'Z'
  return new Date(withZ)
}

// ─── Schedule Schema ───────────────────────────────────────────────────────────

const scheduleSchema = z.object({
  candidate_id: z.string().min(1, 'Candidate is required'),
  panelist_id: z.string().min(1, 'Interviewer is required'),
  title: z.string().min(2, 'Title required'),
  interview_type: z.string().min(1, 'Type required'),
  scheduled_at: z.string().min(1, 'Schedule date required'),
  duration_minutes: z.coerce.number().int().min(15).default(60),
  notes: z.string().optional(),
})
type ScheduleForm = z.infer<typeof scheduleSchema>

// ─── Sub-components ───────────────────────────────────────────────────────────

import toast from 'react-hot-toast'

function MiniStars({ value }: { value: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: 12, color: s <= value ? '#fbbf24' : 'rgba(108,71,255,0.18)' }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: 'var(--text-light)', marginLeft: 4 }}>{value}/5</span>
    </span>
  )
}

function ScorecardAccordion({ applicationId }: { applicationId: string }) {
  const { data: scorecards, isLoading } = useQuery({
    queryKey: ['scorecards', 'application', applicationId],
    queryFn: () => scorecardsApi.getForApplication(applicationId).then((r) => r.data),
    refetchInterval: 30_000,
  })

  if (isLoading) return (
    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--table-border)' }}>
      <p style={{ fontSize: 12, color: 'var(--text-light)' }}>Loading scorecards…</p>
    </div>
  )

  if (!scorecards?.length) return (
    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--table-border)' }}>
      <p style={{ fontSize: 12, color: 'var(--text-light)', textAlign: 'center' }}>No scorecards submitted yet.</p>
    </div>
  )

  return (
    <div style={{ borderTop: '1px solid var(--table-border)', padding: '14px 20px' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
        Scorecards ({scorecards.length})
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {scorecards.map((sc: Scorecard) => {
          const rec = REC_BADGE[sc.recommendation]
          const criteria = ((sc as any).criteria || (sc.criteria_scores as any)?.criteria || sc.criteria_scores) ?? []
          return (
            <div key={sc.id} style={{ background: 'var(--kpi-bg)', border: '1px solid var(--table-border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar name={sc.submitted_by_name ?? 'R'} size="sm" />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{sc.submitted_by_name ?? 'Reviewer'}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-light)' }}>{formatDate(sc.submitted_at)}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MiniStars value={sc.overall_rating} />
                  {rec && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: rec.bg, color: rec.color }}>{rec.label}</span>}
                </div>
              </div>
              {criteria.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px', marginBottom: 8 }}>
                  {criteria.map((c: any) => (
                    <div key={c.criterion}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-mid)' }}>{c.criterion}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-light)' }}>{c.score}/5</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(108,71,255,0.10)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${(c.score / 5) * 100}%`, background: 'linear-gradient(90deg,#6c47ff,#ff6bc6)', borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {sc.summary && <p style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6, fontStyle: 'italic' }}>"{sc.summary}"</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TimeSlotPicker({ 
  selected, 
  onSelect, 
  interviews, 
  selectedDate 
}: { 
  selected: string; 
  onSelect: (time: string) => void;
  interviews: Interview[];
  selectedDate: Date | null;
}) {
  const slots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ]

  const formatAMPM = (time: string) => {
    const [hh, mm] = time.split(':')
    const h = parseInt(hh)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${mm} ${ampm}`
  }

  const isBlocked = (time: string) => {
    if (!selectedDate) return false
    const [h, m] = time.split(':').map(Number)
    
    // Create a date object for this specific slot at the selected date
    const slotTime = new Date(selectedDate)
    slotTime.setHours(h, m, 0, 0)
    
    return (interviews || []).some(iv => {
      if (iv.status === 'cancelled') return false
      
      const ivStart = parseISO(iv.scheduled_at)
      const duration = iv.duration_minutes || 60
      const ivEnd = new Date(ivStart.getTime() + duration * 60 * 1000)
      
      // Check if this slot's start time falls within the existing interview's time range
      // We check if slotTime is >= ivStart AND slotTime < ivEnd
      return slotTime >= ivStart && slotTime < ivEnd
    })
  }

  return (
    <div style={{ marginTop: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Available Slots</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {slots.map(s => {
          const active = selected === s
          const blocked = isBlocked(s)
          return (
            <button
              key={s}
              disabled={blocked}
              onClick={() => onSelect(s)}
              style={{
                padding: '10px 0', borderRadius: 10, 
                border: `1px solid ${active ? '#6c47ff' : blocked ? 'rgba(245,158,11,0.2)' : 'var(--table-border)'}`,
                background: active ? 'rgba(108,71,255,0.1)' : blocked? 'rgba(245,158,11,0.08)' : 'var(--input-bg)',
                color: active ? '#6c47ff' : blocked ? '#f59e0b' : 'var(--text-mid)',
                fontSize: 11, fontWeight: active ? 700 : 600, 
                cursor: blocked ? 'not-allowed' : 'pointer', 
                transition: 'all 0.15s',
                opacity: blocked ? 0.8 : 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
              }}
            >
              <span style={{ fontSize: 13 }}>{formatAMPM(s)}</span>
              {blocked && <span style={{ fontSize: 8, textTransform: 'uppercase' }}>Blocked</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}



// ─── Calendar ─────────────────────────────────────────────────────────────────

function Calendar({
  interviews, selectedDate, onSelectDate,
}: {
  interviews: Interview[]
  selectedDate: Date | null
  onSelectDate: (d: Date | null) => void
}) {
  const [viewDate, setViewDate] = useState(() => new Date())
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const today = new Date()

  const dateMap = useMemo(() => {
    const map: Record<string, InterviewStatus[]> = {}
    for (const iv of interviews) {
      if (iv.status === 'cancelled') continue
      const d = parseISO(iv.scheduled_at)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(iv.status)
    }
    return map
  }, [interviews])

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function statusColor(statuses: InterviewStatus[]) {
    if (statuses.includes('scheduled')) return '#3b82f6'
    if (statuses.includes('completed')) return '#10b981'
    if (statuses.includes('no_show')) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div>
      {/* Month Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--table-border)', background: 'var(--input-bg)', cursor: 'pointer', color: 'var(--text)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
        >‹</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{MONTHS[month]} {year}</span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--table-border)', background: 'var(--input-bg)', cursor: 'pointer', color: 'var(--text)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
        >›</button>
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
        {WEEK_DAYS.map((d, i) => (
          <span key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-light)', opacity: 0.6, textTransform: 'uppercase', padding: '4px 0' }}>{d}</span>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const key = `${year}-${month}-${day}`
          const statuses = dateMap[key]
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
          const isSelected = selectedDate?.getFullYear() === year && selectedDate?.getMonth() === month && selectedDate?.getDate() === day
          const dotColor = statuses ? statusColor(statuses) : null

          return (
            <button
              key={day}
              onClick={() => onSelectDate(new Date(year, month, day))}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 12,
                border: isSelected ? '2px solid #6c47ff' : isToday ? '1px solid rgba(108,71,255,0.3)' : '1px solid transparent',
                cursor: 'pointer',
                background: isSelected ? 'rgba(108,71,255,0.15)' : isToday ? 'rgba(108,71,255,0.05)' : 'transparent',
                color: isSelected ? '#6c47ff' : isToday ? '#6c47ff' : 'var(--text)',
                fontSize: 13, fontWeight: isToday || isSelected ? 800 : 500,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              <span>{day}</span>
              {dotColor && <span style={{ width: 4, height: 4, borderRadius: '50%', background: dotColor, boxShadow: `0 0 8px ${dotColor}` }} />}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--table-border)', flexWrap: 'wrap' }}>
        {([['#3b82f6', 'Scheduled'], ['#10b981', 'Done'], ['#f59e0b', 'No Show'], ['#ef4444', 'Cancelled']] as const).map(([color, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-light)', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />{label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Schedule Form ─────────────────────────────────────────────────────────────

function ScheduleForm({
  onSuccess, preselectedCandidateId, selectedDate, selectedTime, duration,
}: {
  onSuccess: (msg: string) => void
  preselectedCandidateId?: string | null
  selectedDate: Date | null
  selectedTime: string
  duration: number
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { duration_minutes: 60, scheduled_at: '', interview_type: 'video', panelist_id: '' },
  })

  // 1. Initial population for new interviews
  useEffect(() => {
    const initialIso = (selectedDate && selectedTime) ? (() => {
      const [hh, mm] = selectedTime.split(':')
      const d = new Date(selectedDate)
      d.setHours(parseInt(hh), parseInt(mm), 0, 0)
      return d.toISOString()
    })() : ''
    
    reset({
      candidate_id: preselectedCandidateId || '',
      duration_minutes: 60,
      scheduled_at: initialIso,
      interview_type: 'video',
      panelist_id: '',
      title: 'Technical Interview',
      notes: '',
    })
  }, [reset, preselectedCandidateId, selectedDate, selectedTime])

  // 2. Sync date/time from calendar - store full ISO with timezone
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const [hh, mm] = selectedTime.split(':')
      const targetDate = new Date(selectedDate)
      targetDate.setHours(parseInt(hh), parseInt(mm), 0, 0)
      setValue('scheduled_at', targetDate.toISOString())
    }
  }, [selectedDate, selectedTime, setValue])

  const { data: usersResponse } = useQuery({
    queryKey: ['users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
    refetchInterval: 30_000,
  })
  const interviewers = (usersResponse || []).filter(u => u.role === 'interviewer')

  const { data: candidatesList = [] } = useQuery({
    queryKey: ['candidates-for-schedule'],
    queryFn: () => candidatesApi.list({ limit: 100 }).then((r) => r.data.items),
    refetchInterval: 30_000,
  })

  const mutation = useMutation({
    mutationFn: (data: ScheduleForm) => {
      const scheduledIso = data.scheduled_at
      const selectedStage = SCHEDULE_TITLES.find(t => t.value === data.title)
      const payload = {
        candidate_id: data.candidate_id, 
        title: data.title,
        application_id: '', 
        interview_type: (selectedStage?.type || 'video') as InterviewType,
        scheduled_at: scheduledIso, duration_minutes: data.duration_minutes,
        notes: data.notes,
        panelist_ids: data.panelist_id ? [{ user_id: data.panelist_id, role: 'lead' }] : [],
      }
      return interviewsApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
      queryClient.invalidateQueries({ queryKey: ['candidates_pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['candidates-for-schedule'] })
      onSuccess('Interview scheduled!')
      toast.success('Interview scheduled successfully')
      reset({ duration_minutes: 60, scheduled_at: '', interview_type: 'video', panelist_id: '' })
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Controller
        name="title"
        control={control}
        render={({ field }) => (
          <Select
            label="Interview Stage / Title *"
            error={errors.title?.message}
            options={[
              { value: '', label: 'Select stage...' },
              ...SCHEDULE_TITLES.map((t) => ({
                value: t.value,
                label: t.value,
              })),
            ]}
            {...field}
          />
        )}
      />

      <Controller
        name="candidate_id"
        control={control}
        render={({ field }) => (
          <Select
            label="Candidate *"
            error={errors.candidate_id?.message}
            options={[
              { value: '', label: 'Select candidate...' },
              ...candidatesList.map((c) => ({
                value: c.id,
                label: c.full_name,
              })),
            ]}
            {...field}
          />
        )}
      />

      <Controller
        name="panelist_id"
        control={control}
        render={({ field }) => (
          <Select
            label="Interviewer *"
            error={errors.panelist_id?.message}
            options={[{ value: '', label: 'Select interviewer...' }, ...interviewers.map((u) => ({ value: u.id, label: u.full_name }))]}
            {...field}
          />
        )}
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
            background: isSubmitting || mutation.isPending ? 'rgba(108,71,255,0.5)' : 'linear-gradient(135deg,#6c47ff,#8b6bff)',
            color: '#fff', fontSize: 14, fontWeight: 800, cursor: isSubmitting || mutation.isPending ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 24px rgba(108,71,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s'
          }}
        >
          <span>⚡</span>
          {isSubmitting || mutation.isPending
            ? 'Scheduling...'
            : 'Schedule Interview'}
        </button>
      </div>
    </form>
  )
}

// ─── Interview Card ────────────────────────────────────────────────────────────

function InterviewCard({
  interview, expandedScorecard,
  onCancel, onToggleScorecard,
}: {
  interview: Interview
  expandedScorecard: boolean
  onCancel: () => void
  onToggleScorecard: () => void
}) {
  const cfg = STATUS_CONFIG[interview.status] ?? STATUS_CONFIG.scheduled
  const d = parseISO(interview.scheduled_at)
  const typeIcon = TYPE_ICONS[interview.interview_type] ?? '📋'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      layout
      className="glass-card"
      style={{
        padding: '18px 20px',
        borderRadius: 20,
        border: '1px solid var(--sidebar-border)',
        background: 'var(--sidebar-bg)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: cfg.color }} />
      
      <div style={{ display: 'flex', gap: 20 }}>
        {/* Time Column */}
        <div style={{ flexShrink: 0, width: 70, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 900, color: '#6c47ff', marginBottom: 2 }}>
            {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </p>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-light)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {d.getHours() >= 12 ? 'PM' : 'AM'}
          </p>
        </div>

        {/* Info Column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar name={interview.candidate_name || 'C'} size="sm" />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {interview.candidate_name || 'Unnamed Candidate'}
                </h4>
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600 }}>{interview.title}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-light)' }}>
              <span>{typeIcon}</span> {interview.interview_type.replace(/_/g, ' ')}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-light)', opacity: 0.4 }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-light)' }}>
              ⏱️ {interview.duration_minutes}m
            </span>
            {interview.meeting_link && (
              <>
                 <span style={{ fontSize: 11, color: 'var(--text-light)', opacity: 0.4 }}>•</span>
                 <a 
                  href={interview.meeting_link} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ fontSize: 11, fontWeight: 800, color: '#6c47ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  🔗 Meet Link
                </a>
              </>
            )}
          </div>

          {/* Panelists */}
          {interview.panelists && interview.panelists.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex' }}>
                {interview.panelists.slice(0, 3).map((p, idx) => (
                  <div key={p.id} style={{ marginLeft: idx === 0 ? 0 : -8, border: '2px solid var(--sidebar-bg)', borderRadius: '50%' }}>
                    <Avatar name={p.user_name || 'P'} size="xs" />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-light)', opacity: 0.8 }}>
                with {interview.panelists[0]?.user_name?.split(' ')[0]} 
                {interview.panelists.length > 1 ? ` & ${interview.panelists.length - 1} more` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Actions Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          {interview.status === 'scheduled' && (
            <>
              <button 
                onClick={onCancel}
                style={{ padding: '6px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)', fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Cancel
              </button>
            </>
          )}
           {interview.status === 'completed' && interview.application_id && (
              <button 
                onClick={onToggleScorecard}
                style={{ padding: '6px 14px', borderRadius: 10, background: expandedScorecard ? '#6c47ff15' : 'var(--input-bg)', color: expandedScorecard ? '#6c47ff' : 'var(--text-mid)', border: `1px solid ${expandedScorecard ? '#6c47ff30' : 'var(--sidebar-border)'}`, fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {expandedScorecard ? 'Close' : 'Scores'}
              </button>
           )}
        </div>
      </div>

      <AnimatePresence>
        {expandedScorecard && interview.application_id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 16 }}>
              <ScorecardAccordion applicationId={interview.application_id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InterviewsListPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const preselectedCandidateId = searchParams.get('candidateId')
  
  const [selectedDate, setSelectedDate]           = useState<Date | null>(new Date())
  const [selectedTime, setSelectedTime]           = useState<string>('10:00')

  const [cancelTarget, setCancelTarget]           = useState<Interview | null>(null)
  const [cancelReason, setCancelReason]           = useState<string>('')
  const [expandedScorecard, setExpandedScorecard] = useState<string | null>(null)
  const [statusFilter, setStatusFilter]           = useState<InterviewStatus | 'all'>('all')
  const [activeTab, setActiveTab]                 = useState<'schedule' | 'interviews'>('schedule')

  const { data: interviews, isLoading, isError } = useQuery({
    queryKey: ['interviews'],
    queryFn: () => interviewsApi.list().then((r) => r.data),
    refetchInterval: 30_000,
  })


  const filteredInterviews = useMemo(() => {
    if (!interviews) return []
    return interviews.filter((iv) => {
      if (statusFilter !== 'all' && iv.status !== statusFilter) return false
      if (selectedDate) {
        const d = parseISO(iv.scheduled_at)
        if (d.getFullYear() !== selectedDate.getFullYear() ||
            d.getMonth() !== selectedDate.getMonth() ||
            d.getDate() !== selectedDate.getDate()) return false
      }
      return true
    })
  }, [interviews, statusFilter, selectedDate])

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason?: string }) => interviewsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
      queryClient.invalidateQueries({ queryKey: ['candidates_pipeline'] })
      toast.success('Interview cancelled')
      setCancelTarget(null)
      setCancelReason('')
    },
    onError: () => toast.error('Failed to cancel interview'),
  })

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.8px', marginBottom: 4 }}>
            Schedule
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-light)', fontWeight: 500 }}>Auto-conflict-free scheduling with instant Meet links.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
           {user && !user.is_calendar_connected && (
            <button
              onClick={async () => {
                try { const res = await authApi.connectCalendar(); window.location.href = res.data.auth_url }
                catch { toast.error('Could not connect calendar') }
              }}
              className="glass-card"
              style={{ 
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, 
                fontSize: 13, fontWeight: 700, cursor: 'pointer', 
                background: 'rgba(108,71,255,0.1)', color: '#6c47ff', 
                border: '1px solid rgba(108,71,255,0.2)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(108,71,255,0.15)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(108,71,255,0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              📅 Connect Google Calendar
            </button>
          )}
          {user?.is_calendar_connected && (
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: 'rgba(0,212,200,0.1)', color: '#00b5aa', border: '1px solid rgba(0,212,200,0.2)', fontSize: 13, fontWeight: 700 }}>
                <span className="dot-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4c8' }} />
                AI Sync Active
             </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 30, flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Calendar & Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', paddingRight: 4 }}>
          
          {/* Calendar Card */}
          <div className="glass-card" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--sidebar-border)', background: 'var(--sidebar-bg)' }}>
            <Calendar
              interviews={interviews ?? []}
              selectedDate={selectedDate}
              onSelectDate={(d) => d && setSelectedDate(d)}
            />
          </div>

          {/* Quick Schedule Form Card */}
          <div className="glass-card" style={{ padding: 24, borderRadius: 24, border: '1px solid var(--sidebar-border)', background: 'var(--sidebar-bg)' }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>Quick Schedule</h3>
              <p style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500 }}>Book a slot for {selectedDate?.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
            </div>
            
            <TimeSlotPicker 
              selected={selectedTime} 
              onSelect={setSelectedTime} 
              interviews={interviews || []} 
              selectedDate={selectedDate}
            />
            
            <div style={{ marginTop: 24 }}>
              <ScheduleForm
                preselectedCandidateId={preselectedCandidateId}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                duration={60}
                onSuccess={(msg) => {
                  queryClient.invalidateQueries({ queryKey: ['interviews'] })
                  queryClient.invalidateQueries({ queryKey: ['recent-activities'] })
                  toast.success(msg)
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Interviews */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Upcoming Interviews</h3>
             <div style={{ display: 'flex', gap: 8 }}>
                {(['all', 'scheduled', 'completed'] as const).map(f => (
                  <button 
                    key={f} 
                    onClick={() => setStatusFilter(f)}
                    style={{ 
                      padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer',
                      background: statusFilter === f ? '#6c47ff15' : 'transparent',
                      color: statusFilter === f ? '#6c47ff' : 'var(--text-light)',
                      border: `1px solid ${statusFilter === f ? '#6c47ff30' : 'var(--sidebar-border)'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    {f}
                  </button>
                ))}
             </div>
          </div>

          <div 
            style={{ 
              flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 10,
              paddingBottom: 40
            }}
          >
            {isLoading ? (
               Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 120, borderRadius: 20, background: 'var(--sidebar-bg)', border: '1px solid var(--sidebar-border)', opacity: 0.5 }} className="animate-pulse" />
              ))
            ) : filteredInterviews.length === 0 ? (
               <EmptyState 
                  title="No interviews found"
                  description="Use the calendar to pick a different date or schedule a new one."
               />
            ) : (
                filteredInterviews.map(iv => (
                   <InterviewCard
                      key={iv.id}
                      interview={iv}
                      expandedScorecard={expandedScorecard === iv.id}
                      onCancel={() => setCancelTarget(iv)}
                      onToggleScorecard={() => setExpandedScorecard(expandedScorecard === iv.id ? null : iv.id)}
                   />
                ))
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelReason(''); }}
        onConfirm={() => {
          if (cancelTarget) cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason })
        }}
        title="Cancel Interview"
        message={`Are you sure you want to cancel the interview for ${cancelTarget?.candidate_name}? This will notify the candidate and interviewers.`}
        confirmText="Cancel Interview"
        danger
        loading={cancelMutation.isPending}
      >
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', display: 'block', marginBottom: 8 }}>Reason for Cancellation (Optional)</label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g., Candidate withdrew, re-scheduling needed, etc."
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--table-border)',
              background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13, minHeight: 80, resize: 'none'
            }}
          />
        </div>
      </ConfirmModal>

    </div>
  )
}
