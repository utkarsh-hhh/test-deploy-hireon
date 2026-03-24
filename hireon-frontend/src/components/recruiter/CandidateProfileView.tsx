import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import type { Candidate, Scorecard } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate } from '@/utils/formatters'
import { candidatesApi } from '@/api/candidates'
import { scorecardsApi } from '@/api/scorecards'

interface CandidateProfileViewProps {
  candidate: Candidate
}

const STAGE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  applied:                      { color: '#6c47ff', bg: 'rgba(108,71,255,0.10)', label: 'Applied' },
  screening:                    { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'Screening' },
  interview:                    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Interview' },
  pre_screening:                { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'Pre-screening' },
  technical_round:              { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Technical Round' },
  practical_round:              { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Practical Round' },
  techno_functional_round:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Techno-Functional Round' },
  management_round:             { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Management Round' },
  hr_round:                     { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'HR Round' },
  interviewed:                  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Interviewed' },
  offer:                        { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Offer' },
  hired:                        { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Hired' },
  rejected:                     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Rejected' },
  pre_screening_selected:       { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Pre-screening Selected' },
  pre_screening_rejected:       { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Pre-screening Rejected' },
  technical_round_selected:     { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Technical Round Selected' },
  technical_round_rejected:     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Technical Round Rejected' },
  technical_round_back_out:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Technical Round Back Out' },
  practical_round_selected:     { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Practical Round Selected' },
  practical_round_rejected:     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Practical Round Rejected' },
  practical_round_back_out:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Practical Round Back Out' },
  techno_functional_selected:   { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Techno-Functional Selected' },
  techno_functional_rejected:   { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Techno-Functional Rejected' },
  management_round_selected:    { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Management Round Selected' },
  management_round_rejected:    { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Management Round Rejected' },
  hr_round_selected:            { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'HR Round Selected' },
  hr_round_rejected:            { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'HR Round Rejected' },
  offered:                      { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Offered' },
  offered_back_out:             { color: '#f97316', bg: 'rgba(249,115,22,0.10)', label: 'Offered Back Out' },
  offer_withdrawn:              { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Offer Withdrawn' },
  hired_joined:                 { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Hired / Joined' },
}

/** Stages that have past pre-screening and qualify for interview feedback */
const INTERVIEW_STAGES = new Set([
  'technical_round', 'technical_round_selected', 'technical_round_rejected', 'technical_round_back_out',
  'practical_round', 'practical_round_selected', 'practical_round_rejected', 'practical_round_back_out',
  'techno_functional_round', 'techno_functional_selected', 'techno_functional_rejected',
  'management_round', 'management_round_selected', 'management_round_rejected',
  'hr_round', 'hr_round_selected', 'hr_round_rejected',
  'interview', 'interviewed',
  'offered', 'offer', 'hired', 'hired_joined', 'rejected',
])

const REC_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  strong_yes: { label: 'Strong Hire',  color: '#059669', bg: 'rgba(16,185,129,0.12)', icon: '🌟' },
  yes:        { label: 'Hire',         color: '#10b981', bg: 'rgba(16,185,129,0.10)', icon: '✅' },
  maybe:      { label: 'Maybe',        color: '#d97706', bg: 'rgba(251,191,36,0.12)', icon: '🤔' },
  no:         { label: 'No Hire',      color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  icon: '❌' },
  strong_no:  { label: 'Strong No',   color: '#dc2626', bg: 'rgba(239,68,68,0.12)',  icon: '🚫' },
}

function scoreColor(s: number) {
  if (s >= 80) return { text: '#059669', bg: 'rgba(16,185,129,0.12)', track: '#10b981' }
  if (s >= 60) return { text: '#d97706', bg: 'rgba(251,191,36,0.12)', track: '#f59e0b' }
  return { text: '#ef4444', bg: 'rgba(239,68,68,0.10)', track: '#ef4444' }
}

// ─── Feedback Tab ─────────────────────────────────────────────────────────────

function FeedbackTab({ candidate }: { candidate: Candidate }) {
  const stage = candidate.pipeline_stage || 'applied'
  const hasInterviewStage = INTERVIEW_STAGES.has(stage)

  // Fetch applications for this candidate to get application IDs
  const { data: applications = [], isLoading: loadingApps } = useQuery({
    queryKey: ['candidate-applications', candidate.id],
    queryFn: () => candidatesApi.getApplications(candidate.id).then(r => r.data),
    enabled: hasInterviewStage,
  })

  // Derive the first application id
  const applicationId: string | null = Array.isArray(applications) && applications.length > 0
    ? (applications[0]?.id ?? null)
    : null

  const { data: scorecards = [], isLoading: loadingSC } = useQuery({
    queryKey: ['scorecards', 'application', applicationId],
    queryFn: () => scorecardsApi.getForApplication(applicationId).then(r => r.data as Scorecard[]),
    enabled: hasInterviewStage && !!applicationId,
    staleTime: 30_000,
  })

  const currentStageCfg = STAGE_CFG[stage]

  // ── Locked state ──
  if (!hasInterviewStage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 16 }}>
        <div style={{ fontSize: 56 }}>🔒</div>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Interview Feedback Not Available Yet</h3>
        <p style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.7, maxWidth: 340, margin: 0 }}>
          Interview feedback unlocks once the candidate has been{' '}
          {currentStageCfg && (
            <strong style={{ color: currentStageCfg.color }}>{currentStageCfg.label}</strong>
          )}{' '}
          and progressed to at least the <strong style={{ color: '#8b5cf6' }}>Technical Round</strong>. Update the
          candidate's stage using the Action dropdown to unlock this section.
        </p>
      </div>
    )
  }

  if (loadingApps || loadingSC) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 0' }}>
        {[1, 2].map(i => (
          <div key={i} style={{ height: 120, borderRadius: 16, background: 'var(--kpi-bg)', border: '1px solid var(--table-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    )
  }

  // ── No scorecards state ──
  if (!scorecards.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 16 }}>
        <div style={{ fontSize: 48 }}>📋</div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>No Feedback Submitted Yet</h3>
        <p style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.7, maxWidth: 340, margin: 0 }}>
          The candidate is in the interview pipeline. Interviewers can submit feedback from the <strong>Schedule</strong> page after completing an interview.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8 }}>
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {['strong_yes','yes','maybe','no','strong_no'].map(r => {
          const count = scorecards.filter(sc => sc.recommendation === r).length
          if (!count) return null
          const cfg = REC_CFG[r]
          return (
            <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.color}22` }}>
              <span>{cfg.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{count} × {cfg.label}</span>
            </div>
          )
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.15)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6c47ff' }}>
            Avg Rating: {(scorecards.reduce((s, sc) => s + sc.overall_rating, 0) / scorecards.length).toFixed(1)} / 5
          </span>
        </div>
      </div>

      {/* Scorecard cards */}
      {scorecards.map((sc) => {
        const rec = REC_CFG[sc.recommendation]
        const ratingColor = scoreColor((sc.overall_rating / 5) * 100)
        const criteria = sc.criteria_scores ?? []
        return (
          <div key={sc.id} style={{
            background: 'var(--kpi-bg)',
            border: `1px solid var(--table-border)`,
            borderLeft: `4px solid ${rec?.color ?? '#6c47ff'}`,
            borderRadius: 16,
            overflow: 'hidden',
            transition: 'box-shadow 0.2s',
          }}>
            {/* Card header */}
            <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6c47ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                  {(sc.submitted_by_name ?? 'R').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{sc.submitted_by_name ?? 'Interviewer'}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-light)', margin: 0 }}>{formatDate(sc.submitted_at)}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Star rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ fontSize: 16, color: s <= sc.overall_rating ? '#fbbf24' : 'rgba(0,0,0,0.12)' }}>★</span>
                  ))}
                  <span style={{ fontSize: 12, fontWeight: 700, color: ratingColor.text, marginLeft: 4, background: ratingColor.bg, padding: '2px 8px', borderRadius: 20 }}>
                    {sc.overall_rating}/5
                  </span>
                </div>
                {rec && (
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, background: rec.bg, color: rec.color, border: `1px solid ${rec.color}22` }}>
                    {rec.icon} {rec.label}
                  </span>
                )}
              </div>
            </div>

            {/* Criteria scores */}
            {criteria.length > 0 && (
              <div style={{ padding: '0 20px 16px' }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Evaluation Criteria</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                  {criteria.map((c) => (
                    <div key={c.criterion}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mid)' }}>{c.criterion}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)' }}>{c.score}/5</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(108,71,255,0.08)', borderRadius: 4 }}>
                        <div style={{ height: '100%', width: `${(c.score / 5) * 100}%`, background: 'linear-gradient(90deg,#6c47ff,#a855f7)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                      {c.notes && <p style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 2, fontStyle: 'italic' }}>{c.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths / Weaknesses / Summary */}
            {(sc.strengths || sc.weaknesses || sc.summary) && (
              <div style={{ borderTop: '1px solid var(--table-border)', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sc.strengths && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>💪 Strengths</p>
                    <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>{sc.strengths}</p>
                  </div>
                )}
                {sc.weaknesses && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>⚡ Areas to Improve</p>
                    <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>{sc.weaknesses}</p>
                  </div>
                )}
                {sc.summary && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, color: '#6c47ff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>📝 Overall Summary</p>
                    <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, fontStyle: 'italic' }}>"{sc.summary}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Details Tab ─────────────────────────────────────────────────────────────

function DetailsTab({ candidate }: { candidate: Candidate }) {
  const [notes, setNotes] = useState(candidate.hr_notes || '')
  const queryClient = useQueryClient()

  useEffect(() => {
    setNotes(candidate.hr_notes || '')
  }, [candidate.hr_notes])

  const saveNotesMutation = useMutation({
    mutationFn: (newNotes: string) => candidatesApi.update(candidate.id, { hr_notes: newNotes }),
    onSuccess: () => {
      toast.success('Notes saved')
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
    },
    onError: () => {
      toast.error('Failed to save notes')
    }
  })

  // Handle auto-save on blur
  const handleBlur = () => {
    if (notes !== (candidate.hr_notes || '')) {
      saveNotesMutation.mutate(notes)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stats Quick Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {candidate.phone && (
          <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 14, padding: '12px 16px' }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>📞 Phone Number</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{candidate.phone}</p>
          </div>
        )}
        <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 14, padding: '12px 16px' }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>✉ Email ID</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{candidate.email}</p>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 14, padding: '12px 16px' }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>🎯 Experience</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{candidate.years_experience != null ? `${candidate.years_experience} Yrs` : 'N/A'}</p>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 14, padding: '12px 16px' }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>📍 Location</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{candidate.location || 'Remote'}</p>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 14, padding: '12px 16px' }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>📅 Added On</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{formatDate(candidate.created_at)}</p>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 14, padding: '12px 16px' }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>🔗 Source</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{candidate.source || 'Sourced'}</p>
        </div>
      </div>



      {/* Technical Expertise Title removed as it's below */}

      {/* Skills Section */}
      {Boolean(candidate.skills && candidate.skills.length > 0) && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            Technical Expertise <span style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.05)' }} />
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {candidate.skills.map((skill) => (
              <span key={skill} style={{ fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 10, background: '#fff', color: '#6c47ff', border: '1px solid rgba(108,71,255,0.15)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Work Experience */}
      {Boolean(candidate.parsed_data?.experience && Array.isArray(candidate.parsed_data.experience) && (candidate.parsed_data.experience as any[]).length > 0) && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            Career Journey <span style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.05)' }} />
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {(candidate.parsed_data?.experience as any[]).map((exp: any, idx: number) => (
              <div key={idx} style={{ position: 'relative', paddingLeft: 20 }}>
                <div style={{ position: 'absolute', left: 0, top: 4, bottom: 0, width: 2, background: 'linear-gradient(to bottom, #6c47ff, transparent)', borderRadius: 1 }} />
                <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{exp.title}</h4>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#6c47ff', marginBottom: 6 }}>{exp.company} <span style={{ color: 'var(--text-mid)', fontWeight: 500, marginLeft: 6 }}>· {exp.duration}</span></p>
                {exp.description && <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>{exp.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {Boolean(candidate.parsed_data?.education && Array.isArray(candidate.parsed_data.education) && (candidate.parsed_data.education as any[]).length > 0) && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            Academic Foundation <span style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.05)' }} />
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(candidate.parsed_data?.education as any[]).map((edu: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{edu.degree}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>{edu.institution}</p>
                </div>
                {edu.year && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', background: 'rgba(0,0,0,0.03)', padding: '4px 12px', borderRadius: 20 }}>{edu.year}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HR Notes section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}>
            📝 HR Confidential Notes
          </p>
          {saveNotesMutation.isPending && <span style={{ fontSize: 11, color: '#6c47ff', fontWeight: 600 }}>Saving...</span>}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleBlur}
          placeholder="Add private notes about this candidate here. These notes are only visible to your team..."
          style={{
            width: '100%',
            minHeight: 120,
            padding: '14px 16px',
            borderRadius: 14,
            border: '1px solid rgba(0,0,0,0.1)',
            background: 'rgba(0,0,0,0.01)',
            fontSize: 13,
            color: 'var(--text)',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#6c47ff'
            e.currentTarget.style.background = '#fff'
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'
            e.currentTarget.style.background = 'rgba(0,0,0,0.01)'
          }}
        />
        <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8, fontStyle: 'italic' }}>
          Notes auto-save when you click outside the text box.
        </p>
      </div>

    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function CandidateProfileView({ candidate }: CandidateProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'feedback'>('details')
  const stage = candidate.pipeline_stage || 'applied'
  const stageCfg = candidate.pipeline_stage ? STAGE_CFG[stage] : null

  const tabs = [
    { key: 'details',  label: '📋 Candidate Details' },
    { key: 'feedback', label: '🎙️ Interview Feedback' },
  ] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, paddingBottom: 20 }}>
        <Avatar name={candidate.full_name} src={candidate.avatar_url} size="xl" className="ring-4 ring-violet-50 shadow-lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', fontFamily: "'Fraunces', serif", marginBottom: 2, letterSpacing: '-0.02em' }}>
            {candidate.full_name}
          </h3>
          {candidate.current_title && (
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 6 }}>
              {candidate.current_title}{candidate.current_company ? ` · ${candidate.current_company}` : ''}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {stageCfg ? (
              <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 20, background: stageCfg.bg, color: stageCfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stageCfg.label}
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 20, background: 'rgba(0,0,0,0.05)', color: 'var(--text-mid)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Talent Pool
              </span>
            )}
            {candidate.match_score != null && (() => {
              const sc = scoreColor(candidate.match_score)
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.track}30` }}>
                  ⚡ {Math.round(candidate.match_score)}% Match
                </span>
              )
            })()}
            {candidate.resume_url && (
              <a href={candidate.resume_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 11, fontWeight: 700, color: '#6c47ff', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', background: 'rgba(108,71,255,0.08)', padding: '4px 12px', borderRadius: 20 }}>
                📄 Resume
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--table-border)', marginBottom: 24, position: 'relative' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? '#6c47ff' : 'var(--text-light)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'color 0.2s',
            }}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 2, background: '#6c47ff', borderRadius: 2 }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'details'
        ? <DetailsTab candidate={candidate} />
        : <FeedbackTab candidate={candidate} />
      }
    </div>
  )
}
