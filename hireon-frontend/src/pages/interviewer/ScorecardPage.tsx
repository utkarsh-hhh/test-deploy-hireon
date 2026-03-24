import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { interviewsApi } from '@/api/interviews'
import { scorecardsApi } from '@/api/scorecards'
import { aiApi } from '@/api/ai'
import type { Scorecard } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { formatDateTime, formatDate } from '@/utils/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────

type Recommendation = 'hire' | 'maybe' | 'no_hire'
type CriterionKey = 'technical' | 'communication' | 'culture_fit' | 'problem_solving'

interface CriterionConfig {
  key: CriterionKey
  label: string
  emoji: string
  description: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CRITERIA: CriterionConfig[] = [
  { key: 'technical', label: 'Technical Skills', emoji: '⚙️', description: 'Depth of technical knowledge and ability to apply it' },
  { key: 'communication', label: 'Communication', emoji: '💬', description: 'Clarity, listening, and articulation skills' },
  { key: 'culture_fit', label: 'Culture Fit', emoji: '🤝', description: 'Alignment with team values and work style' },
  { key: 'problem_solving', label: 'Problem Solving', emoji: '🧩', description: 'Approach to ambiguous problems and critical thinking' },
]

const REC_OPTIONS: { value: Recommendation; label: string; emoji: string; mapTo: string; color: string; bg: string; border: string; selectedBg: string }[] = [
  {
    value: 'hire',
    label: 'Hire',
    emoji: '✅',
    mapTo: 'yes',
    color: '#059669',
    bg: 'rgba(16,185,129,0.05)',
    border: 'rgba(16,185,129,0.25)',
    selectedBg: 'rgba(16,185,129,0.12)',
  },
  {
    value: 'maybe',
    label: 'Maybe',
    emoji: '🤔',
    mapTo: 'maybe',
    color: '#d97706',
    bg: 'rgba(251,191,36,0.05)',
    border: 'rgba(251,191,36,0.25)',
    selectedBg: 'rgba(251,191,36,0.12)',
  },
  {
    value: 'no_hire',
    label: 'No Hire',
    emoji: '❌',
    mapTo: 'no',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.05)',
    border: 'rgba(239,68,68,0.25)',
    selectedBg: 'rgba(239,68,68,0.12)',
  },
]

const REC_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  strong_yes: { label: 'Strong Hire', color: '#059669', bg: 'rgba(16,185,129,0.12)' },
  yes: { label: 'Hire', color: '#059669', bg: 'rgba(16,185,129,0.10)' },
  maybe: { label: 'Maybe', color: '#d97706', bg: 'rgba(251,191,36,0.12)' },
  no: { label: 'No Hire', color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  strong_no: { label: 'Strong No', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  size = 28,
}: {
  value: number
  onChange?: (v: number) => void
  size?: number
  readonly?: boolean
}) {
  const [hover, setHover] = useState(0)
  const isReadonly = !onChange

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => !isReadonly && onChange!(star)}
          onMouseEnter={() => !isReadonly && setHover(star)}
          onMouseLeave={() => !isReadonly && setHover(0)}
          style={{
            fontSize: size,
            cursor: isReadonly ? 'default' : 'pointer',
            color: star <= (hover || value) ? '#fbbf24' : 'rgba(108,71,255,0.18)',
            transition: 'color 0.12s, transform 0.1s',
            transform: hover === star && !isReadonly ? 'scale(1.15)' : 'scale(1)',
            display: 'inline-block',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          ★
        </span>
      ))}
      {value > 0 && (
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', marginLeft: 6 }}>
          {value}/5
        </span>
      )}
    </div>
  )
}

// ─── Existing Scorecard Card ──────────────────────────────────────────────────

function ExistingCard({ card }: { card: Scorecard }) {
  const rec = REC_BADGE[card.recommendation]
  const criteria = Array.isArray(card.criteria_scores) ? card.criteria_scores : (card.criteria_scores as any)?.criteria ?? []

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 14,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={card.submitted_by_name ?? 'Reviewer'} size="sm" />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {card.submitted_by_name ?? 'Anonymous'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-lite)' }}>{formatDate(card.submitted_at)}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StarRating value={card.overall_rating} size={16} />
          {rec && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
                background: rec.bg,
                color: rec.color,
                border: `1px solid ${rec.color}33`,
              }}
            >
              {rec.label}
            </span>
          )}
        </div>
      </div>

      {/* Criteria bars */}
      {criteria.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {criteria.map((c: any) => (
            <div key={c.criterion}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mid)' }}>{c.criterion}</span>
                <span style={{ fontSize: 11, color: 'var(--text-lite)' }}>{c.score}/5</span>
              </div>
              <div style={{ height: 6, background: 'rgba(108,71,255,0.10)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(c.score / 5) * 100}%`,
                    background: 'linear-gradient(90deg, #6c47ff, #ff6bc6)',
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Text fields */}
      {card.summary && (
        <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.65, fontStyle: 'italic' }}>
          "{card.summary}"
        </p>
      )}
      {(card.strengths || card.weaknesses) && (
        <div style={{ display: 'flex', gap: 14 }}>
          {card.strengths && (
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3 }}>Strengths</p>
              <p style={{ fontSize: 12, color: 'var(--text-mid)' }}>{card.strengths}</p>
            </div>
          )}
          {card.weaknesses && (
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3 }}>Concerns</p>
              <p style={{ fontSize: 12, color: 'var(--text-mid)' }}>{card.weaknesses}</p>
            </div>
          )}
        </div>
      )}
      {card.criteria_scores && Array.isArray(card.criteria_scores) && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {card.criteria_scores.map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{s.criterion}</span>
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={`text-[10px] ${star <= s.score ? 'opacity-100' : 'opacity-20'}`}>★</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 80 }}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        background: type === 'success' ? '#059669' : '#ef4444',
        color: '#fff',
        borderRadius: 12,
        padding: '12px 18px',
        fontSize: 13,
        fontWeight: 600,
        zIndex: 1000,
        boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      }}
    >
      {type === 'success' ? '✅ ' : '❌ '}{message}
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScorecardPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const interview_id = interviewId
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Form state
  const [criteria, setCriteria] = useState<Record<CriterionKey, number>>({
    technical: 0,
    communication: 0,
    culture_fit: 0,
    problem_solving: 0,
  })
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [notes, setNotes] = useState('')
  const [strengths, setStrengths] = useState('')
  const [weaknesses, setWeaknesses] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Derived overall rating = average of 4 criteria (rounded)
  const criteriaValues = Object.values(criteria)
  const allRated = criteriaValues.every((v) => v > 0)
  const overallRating = allRated
    ? Math.round(criteriaValues.reduce((a, b) => a + b, 0) / criteriaValues.length)
    : 0

  // Queries
  const { data: interview, isLoading: intLoading } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: () => interviewsApi.get(interviewId!).then((r) => r.data),
    enabled: !!interviewId,
  })

  const { data: scorecards, isLoading: scLoading } = useQuery({
    queryKey: ['scorecards', 'application', interview?.application_id],
    queryFn: () => scorecardsApi.getForApplication(interview!.application_id || '').then((r) => r.data),
    enabled: !!interview?.application_id,
  })

  const mutation = useMutation({
    mutationFn: () => {
      const recOption = REC_OPTIONS.find((r) => r.value === recommendation)!
      return scorecardsApi.submit({
        interview_id: interviewId!,
        application_id: interview!.application_id || undefined,
        overall_rating: overallRating,
        recommendation: recOption.mapTo,
        criteria_scores: CRITERIA.map((c) => ({
          criterion: c.label,
          score: criteria[c.key],
        })),
        strengths: strengths || undefined,
        weaknesses: weaknesses || undefined,
        summary: notes || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scorecards', 'application', interview?.application_id] })
      queryClient.invalidateQueries({ queryKey: ['candidates_pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      showToast('Scorecard submitted successfully!')
      // Reset form
      setCriteria({ technical: 0, communication: 0, culture_fit: 0, problem_solving: 0 })
      setRecommendation(null)
      setNotes('')
      setStrengths('')
      setWeaknesses('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      showToast(msg ?? 'Failed to submit scorecard', 'error')
    },
  })

  const canSubmit = allRated && recommendation !== null && !mutation.isPending

  // ── Loading ────────────────────────────────────────────────────────────────────
  if (intLoading) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (!interview) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-lite)' }}>Interview not found.</div>
  }

  const isAlreadySubmitted = mutation.isSuccess

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => navigate('/interviewer/interviews')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid var(--input-border)',
            background: 'var(--input-bg)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-mid)',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: "'Fraunces', serif" }}>
            📊 Scorecard & Evaluation
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>
            {interview.title} · Rate the candidate across key competencies
          </p>
        </div>
      </div>

      {/* ── Interview Info Banner ─────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(108,71,255,0.07), rgba(255,107,198,0.04))',
          border: '1px solid rgba(108,71,255,0.15)',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(108,71,255,0.14), rgba(139,107,255,0.06))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 18,
          }}
        >
          📅
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{interview.title}</p>
          <p style={{ fontSize: 12, color: 'var(--text-mid)', marginTop: 2 }}>
            {formatDateTime(interview.scheduled_at)} · {interview.duration_minutes} min ·{' '}
            {interview.interview_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── Left Column ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Competency Ratings */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Competency Ratings</h2>
              {allRated && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'rgba(108,71,255,0.09)',
                    color: '#6c47ff',
                  }}
                >
                  Avg: {(criteriaValues.reduce((a, b) => a + b, 0) / criteriaValues.length).toFixed(1)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {CRITERIA.map((crit, idx) => (
                <div
                  key={crit.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 0',
                    borderBottom: idx < CRITERIA.length - 1 ? '1px solid var(--table-border)' : 'none',
                  }}
                >
                  <div style={{ minWidth: 140 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {crit.emoji} {crit.label}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-lite)', marginTop: 2 }}>{crit.description}</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <StarRating
                      value={criteria[crit.key]}
                      onChange={(v) => !isAlreadySubmitted && setCriteria((prev) => ({ ...prev, [crit.key]: v }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recommendation */}
          <Card>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
              Your Recommendation
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {REC_OPTIONS.map((opt) => {
                const isSelected = recommendation === opt.value
                return (
                  <button
                    key={opt.value}
                    disabled={isAlreadySubmitted}
                    onClick={() => !isAlreadySubmitted && setRecommendation(opt.value)}
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      borderRadius: 10,
                      border: `2px solid ${isSelected ? opt.color : opt.border}`,
                      background: isSelected ? opt.selectedBg : opt.bg,
                      color: opt.color,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isAlreadySubmitted ? 'default' : 'pointer',
                      transition: 'all 0.18s',
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* ── Right Column ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
              Interview Notes
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-mid)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    marginBottom: 6,
                  }}
                >
                  Overall Notes / Summary
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isAlreadySubmitted}
                  placeholder="Share your overall observations and impressions..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid var(--input-border)',
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 13,
                    color: 'var(--text)',
                    background: 'var(--kpi-bg, white)',
                    resize: 'vertical',
                    outline: 'none',
                    lineHeight: 1.65,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#059669',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    marginBottom: 6,
                  }}
                >
                  Strengths
                </label>
                <textarea
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  disabled={isAlreadySubmitted}
                  placeholder="What did the candidate do well? Key positive signals..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(16,185,129,0.25)',
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 13,
                    color: 'var(--text)',
                    background: 'var(--kpi-bg, white)',
                    resize: 'vertical',
                    outline: 'none',
                    lineHeight: 1.65,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#ef4444',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    marginBottom: 6,
                  }}
                >
                  Areas of Concern
                </label>
                <textarea
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  disabled={isAlreadySubmitted}
                  placeholder="What gaps or red flags were noticed?..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid rgba(239,68,68,0.25)',
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 13,
                    color: 'var(--text)',
                    background: 'var(--kpi-bg, white)',
                    resize: 'vertical',
                    outline: 'none',
                    lineHeight: 1.65,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Submit area */}
            <div style={{ marginTop: 18 }}>
              {isAlreadySubmitted ? (
                <div
                  style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.20)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#059669',
                    textAlign: 'center',
                  }}
                >
                  ✅ Scorecard submitted successfully!
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => canSubmit && mutation.mutate()}
                    disabled={!canSubmit}
                    style={{
                      flex: 1,
                      padding: '11px 0',
                      borderRadius: 10,
                      border: 'none',
                      background: canSubmit
                        ? 'linear-gradient(135deg, #6c47ff, #8b6bff)'
                        : 'rgba(108,71,255,0.15)',
                      color: canSubmit ? '#fff' : 'rgba(108,71,255,0.5)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: canSubmit ? 'pointer' : 'not-allowed',
                      fontFamily: "'Sora', sans-serif",
                      boxShadow: canSubmit ? '0 4px 14px rgba(108,71,255,0.30)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {mutation.isPending ? 'Submitting…' : '🧠 Submit Scorecard'}
                  </button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/interviewer/interviews')}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {!allRated && !isAlreadySubmitted && (
                <p style={{ fontSize: 11, color: 'var(--text-lite)', marginTop: 8, textAlign: 'center' }}>
                  Rate all 4 competencies and choose a recommendation to submit
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Existing Scorecards ──────────────────────────────────────────────── */}
      {!scLoading && scorecards && scorecards.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
            Other Scorecards ({scorecards.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scorecards.map((sc) => (
              <ExistingCard key={sc.id} card={sc} />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {toast && <Toast {...toast} />}
      </AnimatePresence>
    </div>
  )
}
