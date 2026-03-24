import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { interviewsApi } from '@/api/interviews'
import { applicationsApi } from '@/api/applications'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'

// ─── Question Generator ────────────────────────────────────────────────────────

interface Question {
  text: string
  tag: string
  tagColor: string
}

const SKILL_QUESTIONS: Record<string, Question[]> = {
  react: [
    { text: 'How do you manage complex state in React — when do you pick Redux vs Context vs Zustand?', tag: 'State Management', tagColor: '#6c47ff' },
    { text: 'Explain how React reconciliation works and how you\'ve optimized renders in production.', tag: 'React Deep Dive', tagColor: '#6c47ff' },
  ],
  typescript: [
    { text: 'How has TypeScript\'s strict mode caught real bugs in your codebase? Walk me through a specific example.', tag: 'TypeScript', tagColor: '#3b82f6' },
    { text: 'Explain generic types and how you\'ve used them to build reusable utilities or components.', tag: 'TypeScript', tagColor: '#3b82f6' },
  ],
  python: [
    { text: 'How do you approach async programming in Python — asyncio vs threading vs multiprocessing?', tag: 'Python', tagColor: '#f59e0b' },
    { text: 'Walk me through your experience with Python type hints and static analysis in production.', tag: 'Python', tagColor: '#f59e0b' },
  ],
  fastapi: [
    { text: 'How have you structured a FastAPI application for scale — routers, dependencies, middleware?', tag: 'Backend', tagColor: '#10b981' },
  ],
  django: [
    { text: 'Describe how you\'ve optimized Django ORM queries in a high-traffic application.', tag: 'Backend', tagColor: '#10b981' },
  ],
  nodejs: [
    { text: 'How do you handle backpressure and memory leaks in a Node.js backend under heavy load?', tag: 'Backend', tagColor: '#10b981' },
  ],
  sql: [
    { text: 'Walk me through a complex query optimization you\'ve done — indexes, execution plans, partitioning.', tag: 'Database', tagColor: '#8b5cf6' },
  ],
  postgresql: [
    { text: 'How have you used PostgreSQL-specific features (CTEs, window functions, JSONB) in production?', tag: 'Database', tagColor: '#8b5cf6' },
  ],
  aws: [
    { text: 'Describe your experience architecting on AWS — which services did you use and how did you handle cost optimization?', tag: 'Cloud', tagColor: '#f59e0b' },
  ],
  docker: [
    { text: 'How have you structured Docker multi-stage builds and container orchestration in your projects?', tag: 'DevOps', tagColor: '#06b6d4' },
  ],
  kubernetes: [
    { text: 'Walk me through a challenging Kubernetes deployment issue you debugged and resolved.', tag: 'DevOps', tagColor: '#06b6d4' },
  ],
  nextjs: [
    { text: 'Explain the difference between SSR, SSG, and ISR in Next.js — when do you use each?', tag: 'Frontend', tagColor: '#6c47ff' },
  ],
  graphql: [
    { text: 'How have you handled N+1 query problems in a GraphQL API? Walk me through your solution.', tag: 'Backend', tagColor: '#10b981' },
  ],
  redis: [
    { text: 'How have you used Redis for caching, pub/sub, or session storage? Describe a specific use case.', tag: 'Infrastructure', tagColor: '#ef4444' },
  ],
}

function generateQuestions(skills: string[], interviewType: string): Question[] {
  const result: Question[] = []
  const seen = new Set<string>()

  skills.forEach((skill) => {
    const key = skill.toLowerCase().replace(/[^a-z]/g, '')
    const qs = SKILL_QUESTIONS[key]
    if (qs) {
      qs.forEach((q) => {
        if (!seen.has(q.text)) {
          seen.add(q.text)
          result.push(q)
        }
      })
    }
  })

  // Always add system design + behavioral
  const systemDesign: Question = {
    text: 'Design a distributed system that needs to handle 1 million events per day with sub-second latency — walk me through your architecture decisions.',
    tag: 'System Design',
    tagColor: '#8b5cf6',
  }
  const technical: Question = {
    text: 'What does your ideal code review process look like? What do you look for as both an author and a reviewer?',
    tag: 'Technical Depth',
    tagColor: '#6c47ff',
  }
  const culture1: Question = {
    text: 'Tell me about a time you had a strong technical disagreement with a teammate. How did you resolve it and what did you learn?',
    tag: 'Culture Fit',
    tagColor: '#00d4c8',
  }
  const culture2: Question = {
    text: 'Describe a technical decision you made that turned out to be wrong. How did you course-correct?',
    tag: 'Culture Fit',
    tagColor: '#00d4c8',
  }

  if (!seen.has(systemDesign.text)) result.push(systemDesign)
  if (interviewType === 'technical' || interviewType === 'final') {
    if (!seen.has(technical.text)) result.push(technical)
  }
  if (!seen.has(culture1.text)) result.push(culture1)
  if (!seen.has(culture2.text)) result.push(culture2)

  return result.slice(0, 8)
}

// ─── Pre-Interview Checklist ───────────────────────────────────────────────────

const CHECKLIST = [
  'Review candidate\'s resume and portfolio',
  'Read the job description and required skills',
  'Review any previous interview notes',
  'Prepare your evaluation criteria',
  'Test your audio and video setup',
  'Keep a notepad ready for live notes',
  'Confirm meeting link is working',
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrepKitPage() {
  const { interviewId } = useParams<{ interviewId: string }>()
  const navigate = useNavigate()
  const [checklist, setChecklist] = useState<Record<number, boolean>>({})

  const { data: interview, isLoading: intLoading } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: () => interviewsApi.get(interviewId!).then((r) => r.data),
    enabled: !!interviewId,
  })

  const { data: application, isLoading: appLoading } = useQuery({
    queryKey: ['application', interview?.application_id],
    queryFn: () => applicationsApi.get(interview!.application_id!).then((r) => r.data),
    enabled: !!interview?.application_id,
  })

  const candidate = application?.candidate
  const isLoading = intLoading || appLoading

  const questions = (candidate && interview)
    ? generateQuestions(candidate.skills ?? [], interview.interview_type)
    : (interview ? generateQuestions([], interview.interview_type) : [])

  const checkedCount = Object.values(checklist).filter(Boolean).length

  if (isLoading) {
    return (
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <div className="md:col-span-3">
            <Skeleton className="h-[480px] rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!interview) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-lite)' }}>
        Interview not found.
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/interviewer/interviews')}
          style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid var(--input-border)',
            background: 'var(--input-bg)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--text-mid)', flexShrink: 0,
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: "'Fraunces', serif" }}>
            🗒️ Interview Prep Kit
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 2 }}>
            {interview.title} · AI-generated questions tailored to role + resume
          </p>
        </div>
        {interview.meeting_link && (
          <a href={interview.meeting_link} target="_blank" rel="noreferrer">
            <button style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px',
              borderRadius: 8, background: 'rgba(16,185,129,0.10)', border: '1.5px solid rgba(16,185,129,0.30)',
              color: '#059669', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif",
            }}>
              🎥 Google Meet
            </button>
          </a>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-5 gap-6">

        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="md:col-span-2">

          {/* Candidate Snapshot */}
          <Card>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-lite)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
              Candidate Snapshot
            </p>
            {candidate ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <Avatar name={candidate.full_name} src={candidate.avatar_url} size="md" />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{candidate.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-mid)' }}>{candidate.current_title ?? 'Candidate'}</p>
                    {candidate.current_company && (
                      <p style={{ fontSize: 11, color: 'var(--text-lite)' }}>{candidate.current_company}</p>
                    )}
                  </div>
                </div>

                {candidate.years_experience != null && (
                  <p style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: 10 }}>
                    <span style={{ fontWeight: 600 }}>Experience:</span> {candidate.years_experience} years
                  </p>
                )}

                {candidate.skills?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-lite)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>Skills</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {candidate.skills.slice(0, 12).map((skill) => (
                        <span key={skill} style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(108,71,255,0.08)', color: '#6c47ff',
                          border: '1px solid rgba(108,71,255,0.15)',
                        }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {candidate.resume_url && (
                  <a href={candidate.resume_url} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 12 }}>
                    <button style={{
                      width: '100%', padding: '8px', borderRadius: 8, border: '1.5px solid rgba(108,71,255,0.25)',
                      background: 'rgba(108,71,255,0.05)', color: '#6c47ff', fontSize: 12,
                      fontWeight: 700, cursor: 'pointer', fontFamily: "'Sora', sans-serif",
                    }}>
                      📄 View Resume
                    </button>
                  </a>
                )}
              </div>
            ) : (
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 22 }}>👤</p>
                <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 6, fontWeight: 600 }}>
                  {interview.candidate_name ?? 'Candidate'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-lite)', marginTop: 3 }}>
                  Detailed profile unavailable
                </p>
              </div>
            )}
          </Card>

          {/* Pre-Interview Checklist */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-lite)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Pre-Interview Checklist
              </p>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: checkedCount === CHECKLIST.length ? 'rgba(16,185,129,0.12)' : 'rgba(108,71,255,0.09)',
                color: checkedCount === CHECKLIST.length ? '#059669' : '#6c47ff',
              }}>
                {checkedCount}/{CHECKLIST.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {CHECKLIST.map((item, idx) => (
                <label key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!checklist[idx]}
                    onChange={(e) => setChecklist((prev) => ({ ...prev, [idx]: e.target.checked }))}
                    style={{ accentColor: '#6c47ff', width: 14, height: 14, cursor: 'pointer', flexShrink: 0, marginTop: 1 }}
                  />
                  <span style={{
                    fontSize: 12, color: checklist[idx] ? 'var(--text-lite)' : 'var(--text-mid)',
                    fontWeight: checklist[idx] ? 400 : 500,
                    textDecoration: checklist[idx] ? 'line-through' : 'none',
                    lineHeight: 1.5, transition: 'all 0.15s',
                  }}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </Card>

        </div>

        {/* Right Column: AI Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="md:col-span-3">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                🤖 AI-Generated Questions
              </h3>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: 'rgba(108,71,255,0.09)', color: '#6c47ff',
                border: '1px solid rgba(108,71,255,0.18)', textTransform: 'uppercase', letterSpacing: '0.8px',
              }}>
                Role + Resume Based
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {questions.map((q, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.055 }}
                  style={{
                    display: 'flex', gap: 12, padding: '14px 16px',
                    borderRadius: 12, background: 'rgba(108,71,255,0.03)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 8,
                    background: 'linear-gradient(135deg, #6c47ff, #8b6bff)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65, fontWeight: 500 }}>
                      {q.text}
                    </p>
                    <span style={{
                      display: 'inline-block', marginTop: 8, fontSize: 10, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 6,
                      color: q.tagColor, background: `${q.tagColor}15`,
                      border: `1px solid ${q.tagColor}25`,
                    }}>
                      {q.tag}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Action bar */}
          <div style={{ display: 'flex', gap: 10 }}>
            {interview.meeting_link && (
              <a href={interview.meeting_link} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                <button style={{
                  width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Sora', sans-serif",
                }}>
                  🎥 Enter Google Meet
                </button>
              </a>
            )}
            <button
              onClick={() => navigate(`/interviewer/live-room/${interviewId}`)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #6c47ff, #8b6bff)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Sora', sans-serif",
                boxShadow: '0 4px 14px rgba(108,71,255,0.28)',
              }}
            >
              🎙️ Start Interview Mode
            </button>
            <button
              onClick={() => navigate(`/interviewer/scorecard/${interviewId}`)}
              style={{
                padding: '11px 18px', borderRadius: 10,
                border: '1.5px solid rgba(108,71,255,0.30)',
                background: 'none', color: '#6c47ff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Sora', sans-serif",
              }}
            >
              📊 Scorecard
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
