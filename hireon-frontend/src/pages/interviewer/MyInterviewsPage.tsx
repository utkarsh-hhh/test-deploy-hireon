import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { interviewsApi } from '@/api/interviews'
import { candidatesApi } from '@/api/candidates'
import type { Interview } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'

/* ── helpers ──────────────────────────────────────────────────────────── */
function isToday(dateStr: string) {
  const d = new Date(dateStr), n = new Date()
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}

function isLiveNow(i: Interview) {
  if (i.status !== 'scheduled') return false
  const start = new Date(i.scheduled_at).getTime()
  const end = start + (i.duration_minutes ?? 60) * 60 * 1000
  const now = Date.now()
  return now >= start - 5 * 60 * 1000 && now <= end
}

function fmtAmPm(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour12: true }).slice(-2)
}

function fmtHourOnly(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function interviewTypeLabel(type: string) {
  const map: Record<string, string> = {
    phone: 'Phone Screen',
    video: 'Video Interview',
    onsite: 'On-site Round',
    technical: 'Technical Round',
    hr: 'HR Round',
    final: 'Final Round',
  }
  return map[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ── resume modal (portal) ────────────────────────────────────────────── */
function ResumeModal({
  interview, candidate, loading, onClose,
}: {
  interview: Interview | null
  candidate: { full_name: string; current_title?: string | null; years_experience?: number | null; resume_url: string | null } | null
  loading: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!interview) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [interview, onClose])

  useEffect(() => {
    document.body.style.overflow = interview ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [interview])

  return createPortal(
    <AnimatePresence>
      {interview && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          />
          {/* panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'relative', width: '100%', maxWidth: 860,
              background: '#fff', borderRadius: 20,
              boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            }}
          >
            {/* header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid #f0f0f0',
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                {interview.candidate_name ?? 'Candidate'} — Resume
              </h2>
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: '#f5f5f5', cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666',
                }}
              >
                ✕
              </button>
            </div>

            {/* body */}
            <div style={{ padding: '20px 24px' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-[60vh] w-full rounded-xl" />
                </div>
              ) : candidate?.resume_url ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{candidate.full_name}</p>
                      <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        {candidate.current_title ?? interview.title}
                        {candidate.years_experience ? ` · ${candidate.years_experience} yrs exp` : ''}
                      </p>
                    </div>
                    <a
                      href={candidate.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '7px 14px', borderRadius: 8, background: '#6c47ff',
                        color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                      }}
                    >
                      Open in new tab ↗
                    </a>
                  </div>
                  <iframe
                    src={`${candidate.resume_url}#toolbar=1&navpanes=0`}
                    title="Resume"
                    style={{ width: '100%', height: '68vh', borderRadius: 12, border: '1px solid #eee' }}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '52px 0', color: '#aaa' }}>
                  <div style={{ fontSize: 38, marginBottom: 12 }}>📄</div>
                  <p style={{ fontWeight: 700, color: '#333', fontSize: 15 }}>No resume uploaded</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>This candidate hasn't uploaded a resume yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

/* ── card component ───────────────────────────────────────────────────── */
function InterviewCard({
  interview, live, delay,
  onEnterRoom, onViewResume, onPrepKit, onReschedule, onScorecard, onConfirm,
}: {
  interview: Interview
  live: boolean
  delay: number
  onEnterRoom: () => void
  onViewResume: () => void
  onPrepKit: () => void
  onReschedule: () => void
  onScorecard: () => void
  onConfirm: () => void
}) {
  const ampm = fmtAmPm(interview.scheduled_at)
  const hourMin = fmtHourOnly(interview.scheduled_at)
  const borderColor = live ? '#16a34a' : interview.status === 'completed' ? '#d1d5db' : '#6c47ff'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
      style={{
        display: 'flex', gap: 0,
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Time Column */}
      <div style={{
        width: 100, flexShrink: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '24px 0',
        borderRight: '1px solid var(--card-border)',
        background: live ? 'rgba(22,163,74,0.03)' : 'transparent'
      }}>
        <span style={{
          fontSize: 28, fontWeight: 900, color: live ? '#16a34a' : '#6c47ff', lineHeight: 1,
          fontFamily: "'Fraunces', serif", letterSpacing: '-1px',
        }}>
          {hourMin}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: live ? '#16a34a' : '#6c47ff', textTransform: 'uppercase' }}>{ampm}</span>
          <span style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 2, fontWeight: 600 }}>Today</span>
        </div>
      </div>

      {/* Info Column */}
      <div style={{ flex: 1, padding: '22px 24px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px 0' }}>
            {interview.candidate_name || interview.title}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 500 }}>
            {interviewTypeLabel(interview.interview_type)} · {interview.duration_minutes} min slot
          </p>
        </div>

        {/* Skills Rail */}
        {interview.candidate_skills && interview.candidate_skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '2px 0' }}>
            {interview.candidate_skills.slice(0, 5).map(skill => (
              <span key={skill} style={{
                padding: '4px 10px', borderRadius: 8, background: 'rgba(108,71,255,0.06)',
                color: '#6c47ff', fontSize: 11, fontWeight: 700, border: '1px solid rgba(108,71,255,0.1)'
              }}>
                {skill}
              </span>
            ))}
            {interview.candidate_skills.length > 5 && (
              <span style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600, alignSelf: 'center', marginLeft: 4 }}>
                +{interview.candidate_skills.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Meeting Link */}
        {interview.meeting_link && interview.status !== 'completed' && (
          <a
            href={interview.meeting_link}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 12, color: '#6c47ff', fontWeight: 700,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 4
            }}
          >
            <span style={{ fontSize: 14 }}>🔗</span>
            {interview.meeting_link.replace(/^https?:\/\//, '')}
          </a>
        )}
      </div>

      {/* Actions Column */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        justifyContent: 'center', gap: 8, padding: '22px 24px', flexShrink: 0,
      }}>
        {live ? (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={onEnterRoom}
            style={{
              padding: '10px 24px', borderRadius: 12, background: '#6c47ff',
              color: '#fff', fontWeight: 800, fontSize: 13, border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(108,71,255,0.3)',
            }}
          >
            Enter Room
          </motion.button>
        ) : interview.status === 'scheduled' ? (
          <>
            {!interview.is_confirmed && (
              <motion.button
                whileHover={{ scale: 1.02, background: '#15803d' }} whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                style={{
                  padding: '9px 24px', borderRadius: 10, background: '#16a34a',
                  color: '#fff', fontWeight: 800, fontSize: 13, border: 'none',
                  cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 12px rgba(22,163,74,0.2)',
                }}
              >
                ✓ Confirm
              </motion.button>
            )}
            {interview.is_confirmed && (
              <div style={{
                padding: '6px 12px', borderRadius: 10, background: 'rgba(22,163,74,0.1)',
                color: '#16a34a', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5
              }}>
                <span style={{ fontSize: 14 }}>✅</span> Confirmed
              </div>
            )}
          </>
        ) : interview.status === 'completed' && (
           <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={onScorecard}
            style={{
              padding: '10px 24px', borderRadius: 12, background: '#3b82f6',
              color: '#fff', fontWeight: 800, fontSize: 13, border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            📊 Scorecard
          </motion.button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          <motion.button
            whileHover={{ background: 'rgba(108,71,255,0.05)' }}
            onClick={onViewResume}
            style={{
              padding: '8px 16px', borderRadius: 10, background: 'transparent',
              border: '1px solid var(--card-border)', color: 'var(--text-mid)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'center'
            }}
          >
            View Resume
          </motion.button>

          {interview.status === 'scheduled' && (
            <motion.button
              whileHover={{ background: 'rgba(108,71,255,0.05)' }}
              onClick={onReschedule}
              style={{
                padding: '8px 16px', borderRadius: 10, background: 'transparent',
                border: '1px solid var(--card-border)', color: 'var(--text-mid)',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'center'
              }}
            >
              Reschedule
            </motion.button>
          )}

          {live && (
            <motion.button
              whileHover={{ background: 'rgba(108,71,255,0.05)' }}
              onClick={onPrepKit}
              style={{
                padding: '8px 16px', borderRadius: 10, background: 'transparent',
                border: '1px solid var(--card-border)', color: 'var(--text-mid)',
                fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'center'
              }}
            >
              Prep Kit
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ── section label ────────────────────────────────────────────────────── */
function SectionLabel({ dot, color, label }: { dot: string; color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 8 }}>
      <span style={{
        width: 10, height: 10, borderRadius: '50%', background: dot, flexShrink: 0,
        boxShadow: `0 0 0 4px ${dot}22`,
      }} />
      <span style={{ fontSize: 12, fontWeight: 900, color, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
        {label}
      </span>
      <div style={{ height: 1, flex: 1, background: 'var(--card-border)', opacity: 0.5, marginLeft: 10 }} />
    </div>
  )
}

/* ── main ─────────────────────────────────────────────────────────────── */
export default function MyInterviewsPage() {
  const navigate = useNavigate()
  const queryControl = (window as any).queryClient
  const [resumeInterview, setResumeInterview] = useState<Interview | null>(null)

  const { data: interviews, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-interviews'],
    queryFn: () => interviewsApi.list().then((r) => r.data),
  })

  const { data: resumeCandidate, isLoading: resumeLoading } = useQuery({
    queryKey: ['candidate', resumeInterview?.candidate_id],
    queryFn: () => candidatesApi.get(resumeInterview!.candidate_id).then((r) => r.data),
    enabled: !!resumeInterview,
  })

  const liveNow       = interviews?.filter(isLiveNow) ?? []
  const upcomingToday = interviews?.filter(
    (i) => isToday(i.scheduled_at) && i.status === 'scheduled' && !isLiveNow(i)
  ).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()) ?? []
  
  const completedToday = interviews?.filter(
    (i) => isToday(i.scheduled_at) && (i.status === 'completed' || i.status === 'no_show')
  ).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()) ?? []

  const firstLive = liveNow[0]

  const handleConfirm = async (id: string) => {
    try {
      await interviewsApi.confirm(id)
      refetch()
    } catch (err) {
      console.error('Failed to confirm interview', err)
    }
  }

  const handlers = (i: Interview) => ({
    onEnterRoom:  () => navigate(`/interviewer/live-room/${i.id}`),
    onViewResume: () => setResumeInterview(i),
    onPrepKit:    () => navigate(`/interviewer/prep-kit/${i.id}`),
    onReschedule: () => navigate('/interviewer/interviews'),
    onScorecard:  () => navigate(`/interviewer/scorecard/${i.id}`),
    onConfirm:    () => handleConfirm(i.id),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, paddingBottom: 40 }}>

      {/* ── header ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: 'var(--text)',
            fontFamily: "'Fraunces', serif", display: 'flex', alignItems: 'center', gap: 12,
            margin: 0
          }}>
            <span style={{ fontSize: 32 }}>📥</span> My Interview Queue
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-mid)', marginTop: 8, fontWeight: 500 }}>
            Your assigned interviews today — confirm, reschedule or jump into the live room.
          </p>
        </div>

        {firstLive ? (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/interviewer/live-room/${firstLive.id}`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '12px 24px', borderRadius: 14,
              background: '#6c47ff', color: '#fff',
              fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer',
              flexShrink: 0, boxShadow: '0 8px 20px rgba(108,71,255,0.4)',
            }}
          >
             <span className="dot-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80' }} />
            Enter Live Room
          </motion.button>
        ) : (
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '12px 24px', borderRadius: 14,
            background: 'var(--card-border)', color: 'var(--text-light)',
            fontWeight: 800, fontSize: 14, border: 'none',
            flexShrink: 0, opacity: 0.6
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d1d5db' }} />
            Enter Live Room
          </div>
        )}
      </div>

      {/* ── loading ───────────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{
              display: 'flex', gap: 0, border: '1px solid var(--card-border)',
              borderRadius: 20, overflow: 'hidden', height: 120, background: 'var(--card-bg)'
            }}>
              <div style={{ width: 100, background: 'var(--card-border)', opacity: 0.1 }} />
              <div style={{ flex: 1, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-3 w-40" />
                <div style={{ display: 'flex', gap: 8 }}>
                   <Skeleton className="h-6 w-16" />
                   <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── error ────────────────────────────────────────────────────── */}
      {isError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 16, padding: '20px', fontSize: 14, color: '#dc2626',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span>⚠️</span> Failed to load interviews. Please refresh the page.
        </div>
      )}

      {/* ── contents ─────────────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {liveNow.length > 0 && (
            <div>
              <SectionLabel dot="#16a34a" color="#16a34a" label="LIVE NOW" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {liveNow.map((i, idx) => (
                  <InterviewCard key={i.id} interview={i} live delay={idx * 0.06} {...handlers(i)} />
                ))}
              </div>
            </div>
          )}

          {upcomingToday.length > 0 && (
            <div>
              <SectionLabel dot="#6c47ff" color="#6c47ff" label="UPCOMING TODAY" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {upcomingToday.map((i, idx) => (
                  <InterviewCard key={i.id} interview={i} live={false} delay={(liveNow.length + idx) * 0.06} {...handlers(i)} />
                ))}
              </div>
            </div>
          )}

          {completedToday.length > 0 && (
            <div>
              <SectionLabel dot="#94a3b8" color="#64748b" label="COMPLETED" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {completedToday.map((i, idx) => (
                  <InterviewCard key={i.id} interview={i} live={false} delay={(liveNow.length + upcomingToday.length + idx) * 0.06} {...handlers(i)} />
                ))}
              </div>
            </div>
          )}

          {liveNow.length === 0 && upcomingToday.length === 0 && completedToday.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              color: 'var(--text-mid)', fontSize: 15,
              background: 'var(--card-bg)', border: '1px dashed var(--card-border)', borderRadius: 24
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
              <p style={{ fontWeight: 800, color: 'var(--text)', fontSize: 18 }}>No interviews assigned today</p>
              <p style={{ fontSize: 14, marginTop: 6, opacity: 0.7 }}>Enjoy your day — we'll notify you when new ones are scheduled!</p>
            </div>
          )}

        </div>
      )}

      {/* ── resume modal ───────────────────── */}
      <ResumeModal
        interview={resumeInterview}
        candidate={resumeCandidate ?? null}
        loading={resumeLoading}
        onClose={() => setResumeInterview(null)}
      />

    </div>
  )
}
