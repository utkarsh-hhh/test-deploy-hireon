import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { interviewsApi } from '@/api/interviews'
import { applicationsApi } from '@/api/applications'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { formatDateTime } from '@/utils/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────

type Verdict = 'hire' | 'maybe' | 'no_hire' | null

const CRITERIA = [
  { key: 'technical' as const, label: 'Technical', emoji: '⚙️' },
  { key: 'communication' as const, label: 'Communication', emoji: '💬' },
  { key: 'culture_fit' as const, label: 'Culture Fit', emoji: '🤝' },
  { key: 'problem_solving' as const, label: 'Problem Solving', emoji: '🧩' },
]

type CriterionKey = typeof CRITERIA[number]['key']

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          style={{
            fontSize: 20, cursor: 'pointer',
            color: star <= (hover || value) ? '#fbbf24' : 'rgba(108,71,255,0.18)',
            transition: 'color 0.1s, transform 0.1s',
            transform: hover === star ? 'scale(1.25)' : 'scale(1)',
            display: 'inline-block', lineHeight: 1, userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 80 }}
      style={{
        position: 'fixed', bottom: 24, right: 24,
        background: '#6c47ff', color: '#fff',
        borderRadius: 12, padding: '12px 18px',
        fontSize: 13, fontWeight: 600, zIndex: 1000,
        boxShadow: '0 8px 30px rgba(108,71,255,0.35)',
      }}
    >
      {message}
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiveRoomPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const navigate = useNavigate()

  // Timer
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Interview state
  const [ratings, setRatings] = useState<Record<CriterionKey, number>>({
    technical: 0, communication: 0, culture_fit: 0, problem_solving: 0,
  })
  const [liveNotes, setLiveNotes] = useState('')
  const [verdict, setVerdict] = useState<Verdict>(null)
  const [askedSet, setAskedSet] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }, [])

  // Timer effect
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Data fetching
  const { data: interview, isLoading: intLoading } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: () => interviewsApi.get(interviewId!).then((r) => r.data),
    enabled: !!interviewId,
  })

  const { data: application } = useQuery({
    queryKey: ['application', interview?.application_id],
    queryFn: () => applicationsApi.get(interview!.application_id!).then((r) => r.data),
    enabled: !!interview?.application_id,
  })

  const candidate = application?.candidate
  const skills = candidate?.skills ?? []

  // Dynamic questions from candidate skills
  const questions = skills.length > 0 ? [
    `How did you first get into ${skills[0]} and what's the most complex thing you've built with it?`,
    'Walk me through a system you designed from scratch — what were the key architectural tradeoffs?',
    'How do you approach debugging a hard-to-reproduce production issue under pressure?',
    `Describe your experience with ${skills[1] ?? 'your secondary stack'} in a team environment.`,
    'Tell me about a time you had a technical disagreement with a teammate. How did it resolve?',
    'How do you balance technical debt vs shipping features on tight deadlines?',
  ] : [
    'Walk me through the most technically complex project you\'ve delivered.',
    'How do you approach debugging hard-to-reproduce production issues?',
    'Describe a system you designed from scratch — key architectural decisions?',
    'Tell me about a technical disagreement with a teammate and how you resolved it.',
    'How do you mentor junior engineers or contribute to team growth?',
    'What does "good engineering culture" mean to you practically?',
  ]

  const endInterview = () => {
    setRunning(false)
    showToast('⏹ Interview ended — going to scorecard')
    setTimeout(() => navigate(`/interviewer/scorecard/${interviewId}`), 1600)
  }

  if (intLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 76, borderRadius: 16, background: 'rgba(108,71,255,0.06)', animation: 'pulse 1.5s ease infinite' }} />
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2" style={{ height: 420, borderRadius: 16, background: 'rgba(108,71,255,0.04)', animation: 'pulse 1.5s ease infinite' }} />
          <div style={{ height: 420, borderRadius: 16, background: 'rgba(108,71,255,0.04)', animation: 'pulse 1.5s ease infinite' }} />
        </div>
      </div>
    )
  }

  if (!interview) {
    return <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-lite)' }}>Interview not found.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Top Banner ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,71,255,0.10), rgba(0,212,200,0.05))',
        border: '1px solid rgba(108,71,255,0.18)',
        borderRadius: 16, padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        {/* Back */}
        <button
          onClick={() => navigate('/interviewer/interviews')}
          style={{
            width: 34, height: 34, borderRadius: 9,
            border: '1px solid rgba(108,71,255,0.25)',
            background: 'rgba(108,71,255,0.07)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6c47ff', flexShrink: 0,
          }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        {/* Live badge + title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
              background: running ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
              color: running ? '#ef4444' : '#059669',
              border: `1px solid ${running ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
            }}>
              {running ? '🔴 LIVE' : '🟢 READY'}
            </span>
            <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: "'Fraunces', serif" }}>
              {interview.title}
            </h1>
            <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>
              · {interview.interview_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 3 }}>
            {formatDateTime(interview.scheduled_at)} · {interview.duration_minutes} min
            {interview.panelists?.length > 0 && ` · ${interview.panelists.map((p) => p.user_name).filter(Boolean).join(', ')}`}
          </p>
        </div>

        {/* Google Meet link */}
        {interview.meeting_link ? (
          <a href={interview.meeting_link} target="_blank" rel="noreferrer">
            <button
              onClick={() => showToast('🎥 Opening Google Meet...')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px',
                borderRadius: 9, background: 'rgba(16,185,129,0.10)',
                border: '1.5px solid rgba(16,185,129,0.30)',
                color: '#059669', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Sora', sans-serif", maxWidth: 220, overflow: 'hidden',
              }}
            >
              <span>🎥</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {interview.meeting_link.replace(/^https?:\/\//, '')}
              </span>
            </button>
          </a>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-lite)' }}>No meeting link</span>
        )}

        {/* Timer controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 20, fontWeight: 900, color: running ? '#6c47ff' : 'var(--text-mid)',
            fontFamily: 'monospace', minWidth: 64, textAlign: 'center',
            transition: 'color 0.2s',
          }}>
            {formatTime(elapsed)}
          </span>
          <button
            onClick={() => {
              if (!running && elapsed === 0) showToast('🎙️ Interview started!')
              setRunning(!running)
            }}
            style={{
              padding: '6px 12px', borderRadius: 7,
              background: running ? 'rgba(239,68,68,0.10)' : 'rgba(108,71,255,0.10)',
              border: `1.5px solid ${running ? 'rgba(239,68,68,0.30)' : 'rgba(108,71,255,0.30)'}`,
              color: running ? '#ef4444' : '#6c47ff',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif",
            }}
          >
            {running ? '⏸ Pause' : '▶ Start'}
          </button>
          <button
            onClick={endInterview}
            style={{
              padding: '6px 12px', borderRadius: 7,
              background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)',
              color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Sora', sans-serif",
            }}
          >
            ⏹ End
          </button>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-5">

        {/* Left: Ratings + Notes + Verdict */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="md:col-span-2">

          {/* Rating Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CRITERIA.map((crit) => (
              <div
                key={crit.key}
                style={{
                  padding: '16px 12px', borderRadius: 12, textAlign: 'center',
                  background: ratings[crit.key] > 0 ? 'rgba(108,71,255,0.08)' : 'var(--card-bg)',
                  border: `1.5px solid ${ratings[crit.key] > 0 ? 'rgba(108,71,255,0.28)' : 'var(--card-border)'}`,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{crit.emoji}</div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 9 }}>{crit.label}</p>
                <StarRating
                  value={ratings[crit.key]}
                  onChange={(v) => setRatings((prev) => ({ ...prev, [crit.key]: v }))}
                />
                {ratings[crit.key] > 0 && (
                  <p style={{ fontSize: 10, color: '#6c47ff', fontWeight: 800, marginTop: 5 }}>
                    {ratings[crit.key]}/5
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Live Notes */}
          <Card>
            <h3 style={{
              fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              📝 Live Notes
              {running && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: 'rgba(239,68,68,0.10)', color: '#ef4444',
                  animation: 'pulse 1.5s ease infinite',
                }}>
                  ● REC
                </span>
              )}
            </h3>
            <textarea
              value={liveNotes}
              onChange={(e) => setLiveNotes(e.target.value)}
              placeholder="Capture key answers, observations, and follow-up points as the interview progresses..."
              rows={8}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid var(--input-border)', fontFamily: "'Sora', sans-serif",
                fontSize: 13, color: 'var(--text)', background: 'var(--kpi-bg, white)',
                resize: 'vertical', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box',
              }}
            />
          </Card>

          {/* Quick Verdict */}
          <Card>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              🎯 Quick Verdict
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'hire' as const, label: 'Hire', emoji: '✅', color: '#059669', border: 'rgba(16,185,129,0.25)', selBg: 'rgba(16,185,129,0.12)' },
                { value: 'maybe' as const, label: 'Maybe', emoji: '🤔', color: '#d97706', border: 'rgba(251,191,36,0.25)', selBg: 'rgba(251,191,36,0.12)' },
                { value: 'no_hire' as const, label: 'No Hire', emoji: '❌', color: '#ef4444', border: 'rgba(239,68,68,0.25)', selBg: 'rgba(239,68,68,0.12)' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVerdict(verdict === opt.value ? null : opt.value)}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: 10,
                    border: `2px solid ${verdict === opt.value ? opt.color : opt.border}`,
                    background: verdict === opt.value ? opt.selBg : 'transparent',
                    color: opt.color, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: "'Sora', sans-serif", transition: 'all 0.18s',
                  }}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </Card>

        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Candidate Card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar
                name={interview.candidate_name ?? candidate?.full_name ?? 'C'}
                src={candidate?.avatar_url}
                size="sm"
              />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {interview.candidate_name ?? candidate?.full_name ?? 'Candidate'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-mid)' }}>
                  {candidate?.current_title ?? interview.interview_type.replace(/_/g, ' ')}
                </p>
                {candidate?.years_experience != null && (
                  <p style={{ fontSize: 10, color: 'var(--text-lite)', marginTop: 1 }}>
                    {candidate.years_experience} yrs exp
                  </p>
                )}
              </div>
            </div>
            {skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {skills.slice(0, 7).map((skill) => (
                  <span key={skill} style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
                    background: 'rgba(108,71,255,0.08)', color: '#6c47ff',
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Questions Checklist */}
          <Card style={{ flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-lite)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 10 }}>
              📋 Questions ({askedSet.size}/{questions.length} asked)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {questions.map((q, idx) => (
                <label
                  key={idx}
                  style={{
                    display: 'flex', gap: 8, cursor: 'pointer', padding: '8px 0',
                    borderBottom: idx < questions.length - 1 ? '1px solid var(--table-border)' : 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={askedSet.has(idx)}
                    onChange={() => {
                      setAskedSet((prev) => {
                        const next = new Set(prev)
                        if (next.has(idx)) next.delete(idx)
                        else next.add(idx)
                        return next
                      })
                    }}
                    style={{ accentColor: '#6c47ff', marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
                  />
                  <span style={{
                    fontSize: 11, color: askedSet.has(idx) ? 'var(--text-lite)' : 'var(--text-mid)',
                    textDecoration: askedSet.has(idx) ? 'line-through' : 'none',
                    lineHeight: 1.5, transition: 'all 0.15s',
                  }}>
                    {q}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {/* Full Scorecard CTA */}
          <button
            onClick={() => navigate(`/interviewer/scorecard/${interviewId}`)}
            style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #6c47ff, #8b6bff)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Sora', sans-serif",
              boxShadow: '0 4px 14px rgba(108,71,255,0.30)',
            }}
          >
            📊 Full Scorecard
          </button>

        </div>
      </div>

      <AnimatePresence>
        {toast && <Toast message={toast} />}
      </AnimatePresence>
    </div>
  )
}
