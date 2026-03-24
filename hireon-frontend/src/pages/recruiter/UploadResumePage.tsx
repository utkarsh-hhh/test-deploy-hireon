import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { resumesApi } from '@/api/resumes'
import { jobsApi } from '@/api/jobs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Select } from '@/components/ui/Select'
import type { Candidate, Job } from '@/types'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ScoringResult {
  final_score: number
  skills_score: number
  title_score: number
  experience_score: number
  education_score: number
  matched_skills: string[]
  missing_skills: string[]
  shortlisted: boolean
  reasoning: string
}

interface JobReq {
  job_id?: string
  role_title: string
  min_experience: string
  match_threshold: string
  required_skills: string
}

type Stage = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error'

const ANALYSIS_STEPS = [
  { id: 'parse', icon: '📄', label: 'Parsing document', getDetail: (c: Candidate) => `Extracted ${(c.summary?.length || 0) + 500} tokens` },
  { id: 'skills', icon: '🏷️', label: 'Extracting explicit skills', getDetail: (c: Candidate) => `Found: ${c.skills.slice(0, 4).join(', ')}` },
  { id: 'score', icon: '🎯', label: 'Generating match score', getDetail: (_: Candidate, s?: ScoringResult) => `Match: ${s?.final_score ?? '?'}% · ${s?.shortlisted ? '✅ Passes' : '❌ Below threshold'}` },
  { id: 'decide', icon: '⚡', label: 'Making shortlist decision', getDetail: (_: Candidate, s?: ScoringResult) => {
    if (s?.shortlisted) return `✅ Shortlisted`
    return `⏸ Needs review`
  }},
]

// ─── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="relative w-[90px] h-[90px] flex-shrink-0">
      <svg width="90" height="90" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="sg-upload">
            <stop offset="0%" stopColor="#6c47ff" />
            <stop offset="100%" stopColor="#ff6bc6" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(108,71,255,0.12)" strokeWidth="8" />
        <motion.circle
          cx="40" cy="40" r={r}
          fill="none"
          stroke="url(#sg-upload)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      {/* Score text centered inside */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 900, fontSize: 18, color: 'var(--text)' }}>
          {score}%
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-mid)' }}>match</span>
      </div>
    </div>
  )
}

import { candidatesApi } from '@/api/candidates'
import toast from 'react-hot-toast'

// ─── Action Buttons ─────────────────────────────────────────────────────────────

function AnalysisActions({ navigate, candidateId, jobId, threshold, currentStage, scoring, onAction }: {
  navigate: any
  candidateId: string
  jobId?: string
  threshold: number
  currentStage?: string
  scoring?: ScoringResult
  onAction: () => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const handleStageUpdate = async (stage: string) => {
    setLoading(stage)
    try {
      await candidatesApi.updateStage(candidateId, stage, false, jobId)
      toast.success(stage === 'applied' ? 'Candidate added to pipeline!' : 'Candidate moved to talent DB')
      queryClient.invalidateQueries({ queryKey: ['candidates_pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      onAction()
      if (stage === 'applied') {
        navigate('/recruiter/pipeline')
      }
    } catch (err) {
      toast.error('Failed to update candidate stage')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading('reject')
    try {
      await candidatesApi.reject(candidateId)
      toast.success('Profile rejected. Rejection email sent.')
      onAction()
    } catch (err) {
      toast.error('Failed to reject profile')
    } finally {
      setLoading(null)
    }
  }

  const isHighMatch = (scoring?.final_score ?? 0) >= threshold

  return (
    <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
      {isHighMatch ? (
        <>
          <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
            {scoring?.reasoning && (
              <div style={{ marginTop: 12, marginBottom: 16, padding: 12, background: 'rgba(34,197,94,0.05)', borderRadius: 10, border: '1px solid rgba(34,197,94,0.1)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#22c55e', marginBottom: 6, textAlign: 'left' }}>
                  AI Match Summary
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5, textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                  {scoring.reasoning}
                </p>
              </div>
            )}

            {scoring && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { lbl: 'Skills', val: scoring.skills_score },
                  { lbl: 'Title', val: scoring.title_score },
                  { lbl: 'Exp.', val: scoring.experience_score },
                  { lbl: 'Edu.', val: scoring.education_score },
                ].map(m => (
                  <div key={m.lbl} style={{ background: 'rgba(108,71,255,0.03)', border: '1px solid rgba(108,71,255,0.1)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600 }}>{m.lbl}</span>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700 }}>{m.val}%</span>
                  </div>
                ))}
              </div>
            )}

            {isHighMatch && !!jobId && (
              <button
                onClick={() => handleStageUpdate('applied')}
                disabled={!!loading}
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                  border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(16,185,129,0.30)', transition: 'all 0.2s',
                  opacity: loading === 'applied' ? 0.7 : 1,
                }}
                onMouseOver={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseOut={e => !loading && (e.currentTarget.style.transform = 'none')}
              >
                {loading === 'applied' ? 'Adding...' : '➕ Add in Pipeline'}
              </button>
            )}


            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => navigate('/recruiter/candidates')}
                style={{
                  flex: 1, padding: '10px 16px',
                  background: 'rgba(108,71,255,0.05)', color: '#6c47ff',
                  border: '1.5px solid rgba(108,71,255,0.2)', borderRadius: 10,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(108,71,255,0.1)')}
                onMouseOut={e => (e.currentTarget.style.background = 'rgba(108,71,255,0.05)')}
              >
                🔍 View Candidate
              </button>

              <button
                onClick={() => navigate('/recruiter/interviews')}
                style={{
                  flex: 1, padding: '10px 16px',
                  background: 'transparent', color: '#6c47ff',
                  border: '1.5px solid rgba(108,71,255,0.2)', borderRadius: 10,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(108,71,255,0.1)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                📅 Schedule Interview
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
            {scoring && (scoring.missing_skills.length > 0 || scoring.reasoning) ? (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(239,68,68,0.05)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.1)' }}>
                {scoring.reasoning && (
                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#ef4444', marginBottom: 6, textAlign: 'left' }}>
                      AI Match Summary
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5, textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                      {scoring.reasoning}
                    </p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                  {[
                    { lbl: 'Skills', val: scoring.skills_score },
                    { lbl: 'Title', val: scoring.title_score },
                    { lbl: 'Exp.', val: scoring.experience_score },
                    { lbl: 'Edu.', val: scoring.education_score },
                  ].map(m => (
                    <div key={m.lbl} style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: 6, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#ef4444', opacity: 0.7, fontWeight: 600 }}>{m.lbl}</span>
                      <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>{m.val}%</span>
                    </div>
                  ))}
                </div>

                {scoring.missing_skills.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#ef4444', marginBottom: 8, textAlign: 'left' }}>
                      Missing Key Skills
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6, textAlign: 'left' }}>
                      {scoring.missing_skills.map((skill, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>{skill}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
                Score is below your {threshold}% threshold.
              </p>
            )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={handleReject}
              disabled={!!loading || currentStage === 'rejected'}
              style={{
                flex: 1, padding: '10px 16px',
                background: currentStage === 'rejected' ? 'rgba(239,68,68,0.1)' : '#ef4444', 
                color: currentStage === 'rejected' ? '#ef4444' : '#fff',
                border: currentStage === 'rejected' ? '1.5px solid rgba(239,68,68,0.2)' : 'none', 
                borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: (loading || currentStage === 'rejected') ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: currentStage === 'rejected' ? 'none' : '0 4px 14px rgba(239,68,68,0.30)', transition: 'all 0.2s',
                opacity: loading === 'reject' ? 0.7 : 1,
              }}
              onMouseOver={e => !loading && currentStage !== 'rejected' && (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseOut={e => !loading && currentStage !== 'rejected' && (e.currentTarget.style.transform = 'none')}
            >
              {loading === 'reject' ? 'Rejecting...' : currentStage === 'rejected' ? '✉ Sent' : '❌ Reject'}
            </button>

            <button
              onClick={() => handleStageUpdate('screening')}
              disabled={!!loading}
              style={{
                flex: 1, padding: '10px 16px',
                background: 'transparent', color: '#d97706',
                border: '1.5px solid rgba(217,119,6,0.30)', borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s',
                opacity: loading === 'screening' ? 0.7 : 1,
              }}
              onMouseOver={e => !loading && (e.currentTarget.style.background = 'rgba(217,119,6,0.07)')}
              onMouseOut={e => !loading && (e.currentTarget.style.background = 'transparent')}
            >
              {loading === 'screening' ? 'Adding...' : '📥 Talent DB'}
            </button>
          </div>

        </>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function UploadResumePage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [stage, setStage] = useState<Stage>('idle')
  const [result, setResult] = useState<Candidate | null>(null)
  const [scoring, setScoring] = useState<ScoringResult | null>(null)
  const [completedSteps, setCompletedSteps] = useState(0)
  const [error, setError] = useState('')
  const [isAddedToPipeline, setIsAddedToPipeline] = useState(false)
  const [jobReq, setJobReq] = useState<JobReq>({
    job_id: undefined,
    role_title: '',
    min_experience: '3',
    match_threshold: '70',
    required_skills: '',
  })

  // Fetch active jobs
  const { data: jobsData } = useQuery({
    queryKey: ['active-jobs'],
    queryFn: () => jobsApi.list({ status: 'active', limit: 100 }).then(r => r.data.items)
  })

  const handleJobSelect = (jobId: string) => {
    const job = jobsData?.find(j => j.id === jobId)
    if (!job) return

    // Use the new min_experience_years field specifically, fallback to experience_level parsing if missing
    const minExp = job.min_experience_years != null 
      ? String(job.min_experience_years)
      : (job.experience_level?.match(/\d+/) ? job.experience_level.match(/\d+/)![0] : '0')

    setJobReq({
      job_id: jobId,
      role_title: job.title,
      min_experience: minExp,
      match_threshold: '70', // Default
      required_skills: (job.skills_required || []).join(', '),
    })
  }

  // Auto-select if only one active job
  useEffect(() => {
    if (jobsData && jobsData.length === 1 && !jobReq.job_id) {
      handleJobSelect(jobsData[0].id)
    }
  }, [jobsData, jobReq.job_id])

  const handleFile = useCallback(async (file: File) => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx', 'doc'].includes(ext ?? '')) {
      setError('Only PDF and DOCX files are supported.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10 MB.')
      return
    }

    setError('')
    setCompletedSteps(0)
    setIsAddedToPipeline(false)
    setStage('uploading')

    try {
      const { data } = await resumesApi.uploadAndCreate(file, {
        job_id: jobReq.job_id,
        role_title: jobReq.role_title,
        required_skills: jobReq.required_skills,
        min_experience: parseFloat(jobReq.min_experience) || 0,
        match_threshold: parseFloat(jobReq.match_threshold) || 70,
      })

      // Animate through steps
      setStage('analyzing')
      const sc: ScoringResult | undefined = data.score_breakdown ?? undefined

      for (let i = 1; i <= ANALYSIS_STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 300))
        setCompletedSteps(i)
      }

      setResult(data)
      setScoring(sc ?? null)
      setStage('done')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Upload failed. Please try again.'
      setError(msg)
      setStage('error')
    }
  }, [jobReq])

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const reset = () => {
    setStage('idle')
    setResult(null)
    setScoring(null)
    setCompletedSteps(0)
    setError('')
    setIsAddedToPipeline(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const isAnalyzing = stage === 'uploading' || stage === 'analyzing'

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 900, color: 'var(--text)', marginBottom: 6 }}>
          Upload Resume
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>
          Drop a resume and watch Hireon AI analyse it against your job requirements.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT PANEL ── */}
        <div>
          {/* Job Requirement Card */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 14, padding: 22, marginBottom: 20, boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Job Requirement</div>

            {/* Select from existing Jobs */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>
                Select Existing Job (Auto-fill)
              </label>
              <Select
                options={[
                  { value: '', label: 'Create custom requirement...' },
                  ...(jobsData?.map(j => ({ value: j.id, label: j.title })) || [])
                ]}
                onChange={(e) => handleJobSelect(e.target.value)}
                value={jobReq.job_id || ''}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>
                Role Title
              </label>
              <input
                className="input-base"
                placeholder="e.g. Senior React Developer"
                value={jobReq.role_title}
                onChange={e => setJobReq(p => ({ ...p, role_title: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>
                  Min. Experience (yrs)
                </label>
                <input
                  className="input-base"
                  type="number"
                  min="0"
                  value={jobReq.min_experience}
                  onChange={e => setJobReq(p => ({ ...p, min_experience: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>
                  Match Threshold (%)
                </label>
                <input
                  className="input-base"
                  type="number"
                  min="0" max="100"
                  value={jobReq.match_threshold}
                  onChange={e => setJobReq(p => ({ ...p, match_threshold: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-mid)', display: 'block', marginBottom: 6 }}>
                Required Skills
              </label>
              <input
                className="input-base"
                placeholder="React, TypeScript, Node.js"
                value={jobReq.required_skills}
                onChange={e => setJobReq(p => ({ ...p, required_skills: e.target.value }))}
              />
              <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>Separate skills with commas</p>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !isAnalyzing && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#6c47ff' : 'rgba(108,71,255,0.28)'}`,
              borderRadius: 14,
              padding: '44px 20px',
              textAlign: 'center',
              cursor: isAnalyzing ? 'not-allowed' : 'pointer',
              background: dragOver ? 'rgba(108,71,255,0.05)' : 'var(--upload-zone, rgba(255,255,255,0.45))',
              transition: 'all 0.3s',
              opacity: isAnalyzing ? 0.6 : 1,
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <div style={{ fontSize: 44, marginBottom: 14 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              {isAnalyzing ? 'Analysing…' : 'Drop a resume here or click to browse'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-mid)' }}>PDF, DOC, DOCX up to 10 MB</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              {['PDF', 'DOCX', 'TXT'].map(t => (
                <span key={t} style={{ padding: '3px 10px', background: 'rgba(108,71,255,0.09)', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#6c47ff' }}>{t}</span>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ef4444' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div>
          <AnimatePresence mode="wait">
            {/* Placeholder when idle */}
            {stage === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 14, padding: 40, textAlign: 'center', boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>AI Analysis Ready</div>
                  <div style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>
                    Fill in the job requirements and drop a resume to get an AI-powered match score, skill analysis, and shortlisting decision.
                  </div>
                </div>
              </motion.div>
            )}

            {/* Analysis steps while uploading / analyzing */}
            {isAnalyzing && (
              <motion.div key="analyzing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div style={{ background: 'var(--kpi-bg)', border: '1px solid var(--card-border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                  {/* Header */}
                  <div style={{ padding: '15px 18px', background: 'linear-gradient(135deg,rgba(108,71,255,.07),rgba(255,107,198,.04))', borderBottom: '1px solid var(--table-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 20, height: 20, border: '2px solid rgba(108,71,255,0.2)',
                      borderTopColor: '#6c47ff', borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite', flexShrink: 0
                    }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Analysing resume…</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-mid)' }}>
                      {completedSteps} / {ANALYSIS_STEPS.length}
                    </div>
                  </div>
                  {/* Steps */}
                  <div style={{ padding: 18 }}>
                    {ANALYSIS_STEPS.map((step, i) => {
                      const done = completedSteps > i
                      const running = completedSteps === i
                      return (
                        <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < ANALYSIS_STEPS.length - 1 ? '1px solid var(--table-border)' : 'none' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0,
                            background: done ? 'rgba(16,185,129,0.12)' : running ? 'rgba(108,71,255,0.12)' : 'rgba(108,71,255,0.06)',
                            animation: running ? 'pop 0.5s ease infinite alternate' : 'none'
                          }}>
                            {step.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: done ? '#10b981' : running ? '#6c47ff' : 'var(--text-mid)' }}>
                              {step.label}
                            </div>
                            {done && (
                              <motion.div
                                initial={{ opacity: 0, maxHeight: 0 }}
                                animate={{ opacity: 1, maxHeight: 40 }}
                                style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2, overflow: 'hidden' }}
                              >
                                {/* Detail shown after completion — will render properly once we have result */}
                              </motion.div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Final result after done */}
            {stage === 'done' && result && (
              <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                {/* Analysis complete header */}
                <div style={{ background: 'var(--kpi-bg)', border: '1px solid var(--card-border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                  <div style={{ padding: '15px 18px', background: 'linear-gradient(135deg,rgba(108,71,255,.07),rgba(255,107,198,.04))', borderBottom: '1px solid var(--table-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 20, height: 20, border: '2px solid #10b981', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#10b981', fontWeight: 700 }}>✓</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Analysis complete</div>
                    <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-mid)' }}>
                      {ANALYSIS_STEPS.length} / {ANALYSIS_STEPS.length} ✓
                    </div>
                  </div>
                  <div style={{ padding: 18 }}>
                    {ANALYSIS_STEPS.map((step, i) => (
                      <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: i < ANALYSIS_STEPS.length - 1 ? '1px solid var(--table-border)' : 'none' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, background: 'rgba(16,185,129,0.12)' }}>
                          {step.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>{step.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                            {step.getDetail(result, scoring ?? undefined)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Result card */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{ background: 'linear-gradient(135deg,rgba(108,71,255,.07),rgba(255,107,198,.04))', border: '1px solid var(--card-border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow)' }}
                >
                  {/* Candidate header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                    {scoring && <ScoreRing score={scoring.final_score} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                        {result.full_name}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 10 }}>
                        {result.current_title || jobReq.role_title || 'Candidate'} · {result.years_experience ? `${result.years_experience} yrs` : '—'}
                      </div>
                      {/* Skill tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {result.skills.slice(0, 7).map(skill => (
                          <span key={skill} style={{
                            padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: (scoring?.matched_skills || []).map(s => s.toLowerCase()).includes(skill.toLowerCase())
                              ? 'rgba(108,71,255,0.12)' : 'rgba(0,212,200,0.10)',
                            color: (scoring?.matched_skills || []).map(s => s.toLowerCase()).includes(skill.toLowerCase())
                              ? '#6c47ff' : '#00b4a8',
                          }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {[
                      { val: result.years_experience ? `${result.years_experience}y` : '—', lbl: 'Years Exp.' },
                      { val: scoring?.final_score ?? '—', lbl: 'AI Score' },
                      { val: scoring?.shortlisted ? '✅ YES' : '⏸ REVIEW', lbl: 'Shortlist' },
                    ].map(m => (
                      <div key={m.lbl} style={{ background: 'var(--kpi-bg)', border: '1px solid var(--table-border)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{m.val}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>{m.lbl}</div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  {result.summary && (
                    <div style={{ background: 'var(--kpi-bg)', border: '1px solid var(--table-border)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: 6 }}>AI Summary</div>
                      <div style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.7 }}>{result.summary}</div>
                    </div>
                  )}

                  {/* Shortlist badge */}
                  {scoring && (
                    <div style={{ marginBottom: 16 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: scoring.shortlisted ? 'rgba(16,185,129,0.12)' : 'rgba(251,191,36,0.12)',
                        color: scoring.shortlisted ? '#059669' : '#d97706',
                        border: `1px solid ${scoring.shortlisted ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.25)'}`,
                      }}>
                        {scoring.shortlisted ? '✅ Auto-Shortlisted' : '⏸ In Review Queue'}
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <AnalysisActions 
                    navigate={navigate} 
                    candidateId={result.id}
                    jobId={jobReq.job_id}
                    threshold={parseFloat(jobReq.match_threshold) || 70}
                    currentStage={result.pipeline_stage || undefined}
                    scoring={scoring ?? undefined}
                    onAction={() => {
                       // When any action happens (Add to Pipeline, Talent DB, etc.),
                       // we want to refresh the candidate data to update the UI.
                       // For simplicity, we can just fetch the updated candidate or 
                       // manually update the local state if we had the new data.
                       // AnalysisActions already triggers a success toast.
                       // Let's just update the local result stage so the button disappears.
                       setResult(prev => prev ? { ...prev, pipeline_stage: 'applied' } : null)
                    }}
                  />

                  {/* Upload another */}
                  <button
                    onClick={reset}
                    style={{ marginTop: 10, width: '100%', padding: '8px', background: 'transparent', border: 'none', color: 'var(--text-mid)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Upload another resume
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CSS for spin and pop */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pop { from { transform: scale(1); } to { transform: scale(1.1); } }
      `}</style>
    </div>
  )
}
