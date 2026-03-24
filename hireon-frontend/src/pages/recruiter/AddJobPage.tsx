import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { jobsApi } from '@/api/jobs'
import type { Job } from '@/types'

// ─── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(2, 'Title is required'),
  location: z.string().optional(),
  responsibilities: z.string().optional(),
  description: z.string().min(10, 'Description is required'),
  requirements: z.string().optional(),
  skills_required: z.array(z.string()).default([]),
  job_type: z.string().default('full_time'),
  experience_level: z.string().optional(),
  min_experience_years: z.coerce.number().min(0).optional(),
  is_remote: z.boolean().default(false),
  openings: z.coerce.number().int().min(1).default(1),
  status: z.enum(['draft', 'active', 'paused', 'closed']).default('active'),
  jd_url: z.string().nullable().optional(),
  jd_filename: z.string().nullable().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Helpers ───────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === 'active') return { label: '● Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
  if (status === 'paused') return { label: '● Paused', color: '#d97706', bg: 'rgba(251,191,36,0.12)' }
  if (status === 'closed') return { label: '● Closed', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
  return { label: '● Draft', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' }
}

const ICON_COLORS = [
  'linear-gradient(135deg,#ddd6fe,#a78bfa)',
  'linear-gradient(135deg,#fce7f3,#f9a8d4)',
  'linear-gradient(135deg,#d1fae5,#6ee7b7)',
  'linear-gradient(135deg,#fef3c7,#fde68a)',
]

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AddJobPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEdit = Boolean(id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [serverError, setServerError] = useState('')
  const [saved, setSaved] = useState(false)
  const [isParsing, setIsParsing] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'active',
      openings: 1,
      is_remote: false,
      skills_required: [],
      job_type: 'full_time',
      min_experience_years: 0,
    },
  })

  // Fetch existing job when in edit mode
  const { data: jobData } = useQuery({
    queryKey: ['jobs', id],
    queryFn: () => jobsApi.get(id!).then(r => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (jobData) {
      reset({
        title: jobData.title,
        location: jobData.location || '',
        responsibilities: jobData.responsibilities || '',
        description: jobData.description,
        requirements: jobData.requirements || '',
        skills_required: jobData.skills_required || [],
        is_remote: jobData.is_remote,
        openings: jobData.openings,
        status: jobData.status as FormData['status'],
        job_type: jobData.job_type,
        experience_level: jobData.experience_level || '',
        min_experience_years: (jobData as unknown as { min_experience_years?: number }).min_experience_years ?? 0,
        jd_url: jobData.jd_url,
        jd_filename: jobData.jd_filename,
      })
    }
  }, [jobData, reset])

  // Fetch all jobs for "Active Job Descriptions" panel
  const { data: jobsRes } = useQuery({
    queryKey: ['jobs', 'list'],
    queryFn: () => jobsApi.list({ limit: 10 }).then(r => r.data),
  })
  const allJobs: Job[] = jobsRes?.items ?? []

  const skills = watch('skills_required') ?? []

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? jobsApi.update(id!, data) : jobsApi.create(data),
    onSuccess: () => {
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] })
      setTimeout(() => {
        navigate('/recruiter/jobs')
      }, 1200)
    },
    onError: (err: unknown) => {
      setServerError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        `Failed to ${isEdit ? 'update' : 'save'} job. Please try again.`
      )
    },
  })

  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setValue('skills_required', [...skills, trimmed])
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) => {
    setValue('skills_required', skills.filter(s => s !== skill))
  }

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkill()
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      setIsParsing(true)
      const parsed = await jobsApi.parseJD(file)
      if (parsed.title) setValue('title', parsed.title)
      if (parsed.location) setValue('location', parsed.location)
      if (parsed.key_responsibilities && parsed.key_responsibilities.length > 0) {
        setValue('responsibilities', typeof parsed.key_responsibilities === 'string' ? parsed.key_responsibilities : parsed.key_responsibilities.join('\n• '))
      }
      if (parsed.min_experience_years != null) setValue('min_experience_years', parsed.min_experience_years)
      if (parsed.description) setValue('description', parsed.description)
      if (parsed.required_skills) setValue('skills_required', parsed.required_skills)
      if (parsed.jd_url) setValue('jd_url', parsed.jd_url)
      if (parsed.jd_filename) setValue('jd_filename', parsed.jd_filename)
    } catch (err) {
      setServerError('Failed to parse JD file automatically.')
    } finally {
      setIsParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 900, color: 'var(--text)', marginBottom: 6 }}>
          {isEdit ? 'Edit Job Description' : 'Upload / Add Job Description'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>
          Add a JD manually or upload a file — Hireon AI extracts requirements automatically.
        </p>
      </div>

      {serverError && (
        <div style={{ marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ef4444' }}>
          ⚠️ {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── LEFT PANEL: Job Details ── */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>Job Details</div>

            {/* Job Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Job Title</label>
              <input className="input-base" placeholder="Senior React Developer" {...register('title')} />
              {errors.title && <p style={errStyle}>{errors.title.message}</p>}
            </div>

            {/* Status & Location */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select className="input-base" {...register('status')}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input className="input-base" placeholder="Remote / Hybrid / City" {...register('location')} />
              </div>
            </div>

            {/* Job Type only */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Job Type</label>
              <select className="input-base" {...register('job_type')}>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>

            {/* Min Exp + Experience Level */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Min. Experience (yrs)</label>
                <input
                  className="input-base"
                  type="number" min="0" placeholder="3"
                  {...register('min_experience_years')}
                />
              </div>
              <div>
                <label style={labelStyle}>Experience Level</label>
                <select className="input-base" {...register('experience_level')}>
                  <option value="">Select level</option>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead / Principal</option>
                  <option value="director">Director+</option>
                </select>
              </div>
            </div>

            {/* Responsibilities */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Key Responsibilities</label>
              <textarea
                className="input-base"
                rows={4}
                placeholder="• Develop new features...&#10;• Maintain legacy systems..."
                {...register('responsibilities')}
              />
            </div>

            {/* Required Skills */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Required Skills</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input-base"
                  placeholder="React, TypeScript, Node.js"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addSkill}
                  style={{ padding: '0 14px', borderRadius: 10, background: 'rgba(108,71,255,0.1)', border: 'none', color: '#6c47ff', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13 }}
                >
                  + Add
                </button>
              </div>
              {skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {skills.map(skill => (
                    <span key={skill} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: 'rgba(108,71,255,0.1)', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#6c47ff' }}>
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c47ff', lineHeight: 1, padding: 0, fontSize: 12 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 4 }}>Press Enter or comma to add</p>
            </div>

            {/* JD Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>JD Description</label>
              <textarea
                className="input-base"
                rows={5}
                placeholder="We are looking for a Senior React Developer with 5+ years of experience building scalable web applications..."
                style={{ resize: 'vertical', minHeight: 100 }}
                {...register('description')}
              />
              {errors.description && <p style={errStyle}>{errors.description.message}</p>}
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={mutation.isPending}
              style={{
                width: '100%', padding: '11px', borderRadius: 10,
                background: saved ? 'linear-gradient(135deg,#10b981,#34d399)' : 'linear-gradient(135deg,#6c47ff,#8b6bff)',
                color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 14px rgba(108,71,255,0.30)', transition: 'all 0.2s',
                opacity: mutation.isPending ? 0.7 : 1,
              }}
            >
              {mutation.isPending ? '⏳ Saving…' : saved ? '✅ Saved!' : '💾 Save Job Description'}
            </button>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Upload JD File */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Upload JD File</div>
                {watch('jd_url') && (
                  <button
                    type="button"
                    onClick={() => window.open(watch('jd_url')!, '_blank')}
                    style={{ background: 'none', border: 'none', color: '#6c47ff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    View Uploaded JD
                  </button>
                )}
              </div>

              {isParsing && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)', borderRadius: 14, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-3"></div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#6c47ff' }}>Extracting details with AI...</div>
                </div>
              )}

              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOver(false)
                  if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0])
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#6c47ff' : 'rgba(108,71,255,0.28)'}`,
                  borderRadius: 14, padding: 36, textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'rgba(108,71,255,0.05)' : 'var(--upload-zone, rgba(255,255,255,0.45))',
                  transition: 'all 0.3s',
                }}
              >
                <input
                  type="file"
                  id="jd-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileUpload(f)
                  }}
                />
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Drop your JD file here</div>
                <div style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: 12 }}>
                  AI will auto-extract skills, experience &amp; requirements
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {['PDF', 'DOCX', 'TXT'].map(t => (
                    <span key={t} style={{ padding: '3px 10px', background: 'rgba(108,71,255,0.09)', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#6c47ff' }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Job Descriptions */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Active Job Descriptions</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6c47ff', background: 'rgba(108,71,255,0.09)', padding: '2px 9px', borderRadius: 20 }}>
                  {allJobs.filter(j => j.status === 'active').length} open roles
                </span>
              </div>

              {allJobs.filter(j => j.status === 'active').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-light)', fontSize: 13 }}>
                  No active job descriptions found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {allJobs.filter(j => j.status === 'active').slice(0, 5).map((job, i) => {
                    const badge = statusBadge(job.status)
                    return (
                      <div
                        key={job.id}
                        onClick={() => navigate(`/recruiter/jobs/${job.id}/edit`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--activity-bg)', border: '1px solid var(--table-border)', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseOver={e => (e.currentTarget.style.background = 'var(--kpi-bg)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'var(--activity-bg)')}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, background: ICON_COLORS[i % ICON_COLORS.length] }}>
                          💼
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-light)' }}>
                            {[job.location, job.experience_level].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: badge.bg, color: badge.color, flexShrink: 0 }}>
                          {badge.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {allJobs.length > 5 && (
                <button
                  type="button"
                  onClick={() => navigate('/recruiter/jobs')}
                  style={{ marginTop: 12, width: '100%', padding: 8, background: 'transparent', border: 'none', color: '#6c47ff', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  View all {allJobs.length} jobs →
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

// ─── Style helpers ─────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color: 'var(--text-mid)',
  display: 'block',
  marginBottom: 6,
}

const errStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#ef4444',
  marginTop: 4,
}
