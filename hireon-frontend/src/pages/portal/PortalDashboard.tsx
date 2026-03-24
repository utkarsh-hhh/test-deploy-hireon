import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { portalApi } from '@/api/portal'
import { useAuthStore } from '@/store/authStore'
import { formatDate } from '@/utils/formatters'

// Display stages shown in the tracker
const STAGES = [
  { key: 'applied',      label: 'Applied',      sublabel: '' },
  { key: 'shortlisted',  label: 'Shortlisted',  sublabel: 'Pre-screening' },
  { key: 'round1',       label: 'Round 1',      sublabel: 'Technical' },
  { key: 'round2',       label: 'Round 2',      sublabel: 'Techno-Functional' },
  { key: 'round3',       label: 'Round 3',      sublabel: 'Management' },
  { key: 'hr_round',     label: 'HR Round',     sublabel: 'Final Step' },
  { key: 'offer',        label: 'Offer',        sublabel: '' },
] as const

// Maps backend pipeline_stage → tracker step index (0-based)
function stageIndex(stage: string): number {
  if (!stage || stage === 'applied' || stage === 'needs_review') return 0
  // Shortlisted: pre-screening selected
  if (stage === 'pre_screening_selected') return 1
  // Pre-screening (in progress) → still shortlisted step
  if (stage === 'pre_screening') return 1
  // Round 1: Technical
  if (['technical_round', 'technical_round_selected', 'technical_round_rejected', 'technical_round_back_out'].includes(stage)) return 2
  // Round 2: Techno-Functional / Practical
  if (['practical_round', 'practical_round_selected', 'practical_round_rejected', 'practical_round_back_out',
       'techno_functional_round', 'techno_functional_selected', 'techno_functional_rejected'].includes(stage)) return 3
  // Round 3: Management / Interviewed
  if (['management_round', 'management_round_selected', 'management_round_rejected', 'interviewed', 'interview'].includes(stage)) return 4
  // HR Round
  if (['hr_round', 'hr_round_selected', 'hr_round_rejected'].includes(stage)) return 5
  // Offer / Hired
  if (['offered', 'offer', 'hired', 'hired_joined'].includes(stage)) return 6
  return 0
}

function getProgressPercent(currentIndex: number): number {
  const pct = [10, 25, 40, 55, 70, 85, 100]
  return pct[Math.min(currentIndex, pct.length - 1)]
}


function StageChip({ stage }: { stage: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    applied:   { bg: 'rgba(124,58,237,0.10)', color: '#7c3aed', label: 'Applied' },
    screening: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Screening' },
    pre_screening: { bg: 'rgba(59,130,246,0.10)', color: '#3b82f6', label: 'Pre-screening' },
    technical_round: { bg: 'rgba(6,182,212,0.12)', color: '#06b6d4', label: 'Technical Round' },
    practical_round: { bg: 'rgba(6,182,212,0.12)', color: '#06b6d4', label: 'Practical Round' },
    techno_functional_round: { bg: 'rgba(6,182,212,0.12)', color: '#06b6d4', label: 'Techno-Functional Round' },
    management_round: { bg: 'rgba(6,182,212,0.12)', color: '#06b6d4', label: 'Management Round' },
    hr_round: { bg: 'rgba(6,182,212,0.12)', color: '#06b6d4', label: 'HR Round' },
    interview: { bg: 'rgba(6,182,212,0.12)',  color: '#06b6d4', label: 'Interview' },
    interviewed: { bg: 'rgba(6,182,212,0.12)', color: '#06b6d4', label: 'Interviewed' },
    offer:     { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Offer' },
    hired:     { bg: 'rgba(16,185,129,0.16)', color: '#059669', label: 'Hired' },
    rejected:  { bg: 'rgba(239,68,68,0.10)',  color: '#ef4444', label: 'Rejected' },
  }
  const c = cfg[stage] ?? cfg.applied
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 11px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: c.bg,
        color: c.color,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
      {c.label}
    </span>
  )
}

function StageTracker({ stage }: { stage: string }) {
  const current = stageIndex(stage)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 16 }}>
      {STAGES.map((s, i) => {
        const isDone = i < current
        const isActive = i === current
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : undefined }}>
            {/* Dot */}
            <div
              title={s.label}
              style={{
                width: isActive ? 14 : 10,
                height: isActive ? 14 : 10,
                borderRadius: '50%',
                flexShrink: 0,
                background: isDone
                  ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                  : isActive
                  ? 'linear-gradient(135deg,#06b6d4,#22d3ee)'
                  : 'rgba(176,164,204,0.35)',
                boxShadow: isActive ? '0 0 0 4px rgba(6,182,212,0.18)' : undefined,
                animation: isActive ? 'portal-stage-pulse 2s ease-in-out infinite' : undefined,
                transition: 'all 0.3s',
              }}
            />
            {/* Line */}
            {i < STAGES.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: isDone || isActive
                    ? 'linear-gradient(90deg,#7c3aed,#a855f7)'
                    : 'rgba(176,164,204,0.25)',
                  margin: '0 2px',
                  transition: 'background 0.3s',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )}

export default function PortalDashboard() {
  const navigate = useNavigate()

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['portal', 'applications'],
    queryFn: () => portalApi.myApplications().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: interviews, isLoading: intLoading } = useQuery({
    queryKey: ['portal', 'interviews'],
    queryFn: () => portalApi.myInterviews().then((r) => r.data),
    refetchInterval: 30_000,
  })

  // Fetch candidate profile as fallback — recruiters may update stage before
  // an Application record exists (invite-only flow, no job linked yet)
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['portal', 'profile'],
    queryFn: () => portalApi.profile().then((r) => r.data),
    refetchInterval: 30_000,
  })

  if (appsLoading || intLoading || profileLoading) {
    return <div className="p-8 text-center text-[var(--text-lite)]">Loading application journey...</div>
  }

  const activeApp = applications?.find(a => !['hired', 'rejected'].includes(a.stage)) || applications?.[0]

  // If no Application record yet but recruiter set a pipeline_stage on the candidate,
  // build a synthetic display object so the tracker renders correctly
  const syntheticApp = !activeApp && profile?.pipeline_stage
    ? {
        id: 'synthetic',
        stage: profile.pipeline_stage as string,
        applied_at: profile.created_at,
        stage_changed_at: profile.updated_at,
        job: null as any,
        match_score: profile.match_score,
        source: profile.source,
        rejection_reason: null,
      }
    : null

  const displayApp = activeApp ?? syntheticApp

  if (!displayApp) {
    return (
      <div className="page active" id="page-journey">
        <div className="ph">
          <div className="pt">Your Application Journey 🗺️</div>
          <div className="ps">Start applying to open roles to track your progress!</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/portal/openings')}>View Openings</button>
      </div>
    )
  }

  const currentIdx = stageIndex(displayApp.stage)
  const isRejected = displayApp.stage === 'rejected'
  const isHired = displayApp.stage === 'hired'
  const progressWidth = `${getProgressPercent(currentIdx)}%`

  // Sort interviews by date descending
  const history = [...(interviews || [])].sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

  // Calc days in process
  const msInSys = Date.now() - new Date(displayApp.applied_at).getTime()
  const daysInProcess = Math.max(1, Math.floor(msInSys / (1000 * 60 * 60 * 24)))

  return (
    <div className="page active" id="page-journey">
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="pt">Your Application Journey 🗺️</div>
            <div className="ps">Applying for <strong>{displayApp.job?.title || (syntheticApp ? profile?.applied_job_title || 'Your Application' : 'Role')}</strong> · Applied {formatDate(displayApp.applied_at)}</div>
          </div>
          {isRejected ? (
            <span className="chip chip-red"><span className="chd"></span>Rejected</span>
          ) : isHired ? (
            <span className="chip chip-green"><span className="chd"></span>Hired!</span>
          ) : (
            <span className="chip chip-teal"><span className="chd"></span>Stage: {displayApp.stage.charAt(0).toUpperCase() + displayApp.stage.slice(1)}</span>
          )}
        </div>
      </div>

      {/* Tracker Card */}
      <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
        <div className="ctitle">
          Stage Progress
          <span className="ctag teal">Step {Math.min(currentIdx + 1, 7)} of 7</span>
        </div>
        
        <div className="tracker-wrap">
          <div className="tracker-line"></div>
          <div className="tracker-progress" style={{ width: progressWidth }}></div>
          <div className="tracker-steps">
            {STAGES.map((s, i) => {
              const isDone = currentIdx > i
              const isActive = currentIdx === i
              const dotChar = isDone ? '✓' : isActive ? '●' : '○'
              return (
                <div key={s.key} className={`tstep ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                  <div className="tstep-dot">{dotChar}</div>
                  <div className="tstep-label">{s.label}</div>
                  {s.sublabel && (
                    <div style={{ fontSize: 9, color: isActive ? '#06b6d4' : 'var(--text-lite)', fontWeight: 600, marginTop: 2, textAlign: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {s.sublabel}
                    </div>
                  )}
                  {i === 0 && isActive && <div className="tstep-date">{formatDate(displayApp.applied_at)}</div>}
                  {!isDone && !isActive && <div className="tstep-note">Pending</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Dynamic Stage Detail Card based on active stage */}
        <div className="stage-detail-card">
          <div className="stage-label">Current Stage</div>
          <div className="stage-title">
            {currentIdx === 0 && 'Application Received'}
            {currentIdx === 1 && 'Shortlisted — Pre-screening'}
            {currentIdx === 2 && 'Round 1 — Technical Round'}
            {currentIdx === 3 && 'Round 2 — Techno-Functional Round'}
            {currentIdx === 4 && 'Round 3 — Final Round (Management)'}
            {currentIdx === 5 && 'HR Round'}
            {currentIdx === 6 && (isHired ? 'Welcome to the team! 🎉' : 'Offer Stage')}
            {isRejected && 'Application Closed'}
          </div>
          <div className="stage-sub">
            {currentIdx === 0 && 'Your application has been received and is waiting to be reviewed by the team.'}
            {currentIdx === 1 && 'Great news! You have been shortlisted. An HR representative will reach out to you shortly.'}
            {currentIdx === 2 && 'You are in the Technical Round. Complete your scheduled technical interview.'}
            {currentIdx === 3 && 'You have cleared Round 1! You are now in the Techno-Functional round.'}
            {currentIdx === 4 && 'Excellent progress! You are in the Final Management round.'}
            {currentIdx === 5 && 'Almost there! You are in the HR round — final step before the offer.'}
            {currentIdx === 6 && (isHired ? 'You have officially accepted the offer. Congratulations!' : 'Your offer document is being prepared. Please check your offers section.')}
            {isRejected && "Thank you for your time. This application didn't proceed further."}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            {(currentIdx >= 2 && currentIdx <= 5) && <button className="btn btn-teal btn-sm" onClick={() => navigate('/portal/interviews')}>📅 View Interviews</button>}
            {currentIdx === 6 && <button className="btn btn-primary btn-sm" onClick={() => navigate('/portal/offers')}>📄 View Offer</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/portal/prep')}>🎯 Open Prep Hub</button>
          </div>
        </div>
      </div>

      <div className="g2">
        {/* Round History */}
        <div className="card">
          <div className="ctitle">Round History</div>
          <div>
            {history.length === 0 ? (
              <div className="py-4 text-center text-[12px] text-[var(--text-lite)]">No interview history yet.</div>
            ) : (
              history.map((intv) => {
                const isUpcoming = intv.status === 'scheduled';
                const isPassed = intv.status === 'completed' || (intv.status as string) === 'passed';
                const isFailed = (intv.status as string) === 'failed' || intv.status === 'cancelled';
                return (
                  <div className="rh-item" key={intv.id}>
                    <div className={`rh-dot ${isUpcoming ? 'rhd-active' : isPassed ? 'rhd-done' : 'rhd-pend'}`}></div>
                    <div>
                      <div className="rh-name">{intv.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-lite)' }}>
                        {intv.interview_type.replace('_', ' ')} · {intv.duration_minutes} min · {formatDate(intv.scheduled_at)}
                      </div>
                    </div>
                    {isUpcoming && <span className="chip chip-teal">Upcoming</span>}
                    {isPassed && <span className="chip chip-green">Passed ✓</span>}
                    {isFailed && <span className="chip chip-gray">Closed</span>}
                  </div>
                )
              })
            )}
            {/* Show pending next rounds based on stage */}
            {currentIdx === 2 && (
              <div className="rh-item">
                <div className="rh-dot rhd-pend"></div>
                <div>
                  <div className="rh-name">Next Rounds</div>
                  <div style={{ fontSize: 11, color: 'var(--text-lite)' }}>Pending HR scheduling</div>
                </div>
                <span className="chip chip-gray" style={{ fontSize: 10 }}>Upcoming</span>
              </div>
            )}
          </div>
        </div>

        {/* Application Stats */}
        <div className="card">
          <div className="ctitle">Your Application Stats</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="kpi" style={{ border: 'none', padding: 0, boxShadow: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="kpi-ico ki1">📅</div>
              <div><div className="kpi-val" style={{ fontSize: 24 }}>{daysInProcess}</div><div className="kpi-lbl">Days in Process</div></div>
            </div>
            
            <div style={{ borderTop: '1px solid var(--table-border)', paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>Process Completion</div>
              <div className="pbar"><div className="pfill" style={{ width: progressWidth }}></div></div>
              <div style={{ fontSize: 11, color: 'var(--text-lite)', marginTop: 5 }}>
                {Math.min(currentIdx + 1, 7)} of 7 stages · {progressWidth}
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid var(--table-border)', paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 10, fontFamily: "'Space Grotesk', sans-serif" }}>Applied Role</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{displayApp.job?.title || (syntheticApp ? profile?.applied_job_title || 'Invited Candidate' : 'Unknown Role')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-lite)', marginTop: 3 }}>
                {displayApp.job?.department || ''} · {displayApp.job?.location || 'Remote'}
              </div>
              {displayApp.job?.skills_required && displayApp.job.skills_required.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {displayApp.job.skills_required.slice(0, 4).map((skill: string) => (
                    <span key={skill} style={{ background: 'rgba(124,58,237,.08)', color: 'var(--brand)', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
