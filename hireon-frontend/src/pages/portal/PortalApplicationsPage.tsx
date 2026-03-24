import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/api/portal'
import { formatDate, stageLabel } from '@/utils/formatters'

const PIPELINE_STAGES = ['applied', 'screening', 'interview', 'interviewed', 'offer', 'hired'] as const
type PipelineStage = (typeof PIPELINE_STAGES)[number]

const STAGE_CFG: Record<string, { bg: string; color: string }> = {
  applied:   { bg: 'rgba(124,58,237,0.10)', color: '#7c3aed' },
  screening: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  interview: { bg: 'rgba(6,182,212,0.12)',  color: '#06b6d4' },
  interviewed: { bg: 'rgba(6,182,212,0.12)', color: '#06b6d4' },
  offer:     { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  hired:     { bg: 'rgba(16,185,129,0.16)', color: '#059669' },
  rejected:  { bg: 'rgba(239,68,68,0.10)',  color: '#ef4444' },
}

function StageChip({ stage }: { stage: string }) {
  const c = STAGE_CFG[stage] ?? STAGE_CFG.applied
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
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
      {stageLabel(stage)}
    </span>
  )
}

function StageBar({ stage }: { stage: string }) {
  const currentIdx = PIPELINE_STAGES.indexOf(stage as PipelineStage)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {PIPELINE_STAGES.map((s, i) => {
          const isDone = i < currentIdx
          const isActive = i === currentIdx
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE_STAGES.length - 1 ? 1 : undefined }}>
              <div
                title={stageLabel(s)}
                style={{
                  width: isActive ? 12 : 8,
                  height: isActive ? 12 : 8,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: isDone
                    ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                    : isActive
                    ? 'linear-gradient(135deg,#06b6d4,#22d3ee)'
                    : 'rgba(176,164,204,0.30)',
                  boxShadow: isActive ? '0 0 0 3px rgba(6,182,212,0.20)' : undefined,
                }}
              />
              {i < PIPELINE_STAGES.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    background: isDone
                      ? 'linear-gradient(90deg,#7c3aed,#a855f7)'
                      : 'rgba(176,164,204,0.22)',
                    margin: '0 2px',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {PIPELINE_STAGES.map((s) => (
          <span
            key={s}
            style={{
              fontSize: 10,
              color: s === stage ? '#7c3aed' : 'var(--p-text-lite)',
              fontWeight: s === stage ? 700 : 500,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              textTransform: 'capitalize',
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function PortalApplicationsPage() {
  const { data: applications, isLoading, isError } = useQuery({
    queryKey: ['portal', 'applications'],
    queryFn: () => portalApi.myApplications().then((r) => r.data),
    refetchInterval: 30_000,
  })

  return (
    <div style={{ fontFamily: "'Sora', sans-serif", color: 'var(--p-text)' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 30,
            fontWeight: 700,
            color: 'var(--p-text)',
            lineHeight: 1.2,
            marginBottom: 4,
          }}
        >
          My Applications
        </h1>
        <p style={{ fontSize: 14, color: 'var(--p-text-mid)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {applications
            ? `${applications.length} application${applications.length !== 1 ? 's' : ''}`
            : 'Track all your job applications'}
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: 120,
                borderRadius: 16,
                background: 'rgba(124,58,237,0.05)',
              }}
            />
          ))}
        </div>
      ) : isError ? (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.20)',
            color: '#ef4444',
            fontSize: 13,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Failed to load applications.
        </div>
      ) : !applications?.length ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--p-text-lite)',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "'Fraunces', serif",
              color: 'var(--p-text-mid)',
              marginBottom: 6,
            }}
          >
            No applications yet
          </p>
          <p style={{ fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            You haven't applied to any jobs yet. Check back when the recruiter links you to a position.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {applications.map((app) => (
            <div
              key={app.id}
              style={{
                background: 'var(--p-kpi)',
                border: '1px solid var(--p-table-border)',
                borderRadius: 16,
                padding: '20px 22px',
                boxShadow: 'var(--p-shadow)',
                transition: 'all 0.25s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--p-shadow-h)'
                ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--p-shadow)'
                ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
              }}
            >
              {/* Top row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 14,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--p-text)',
                      marginBottom: 4,
                    }}
                  >
                    {app.job?.title ?? 'Position'}
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      fontSize: 12,
                      color: 'var(--p-text-mid)',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {app.job?.location && <span>{app.job.location}</span>}
                    {app.job?.is_remote && <span style={{ color: '#06b6d4' }}>· Remote</span>}
                  </div>
                </div>
                <StageChip stage={app.stage} />
              </div>

              {/* Meta row */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  fontSize: 11,
                  color: 'var(--p-text-lite)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  marginBottom: 16,
                  flexWrap: 'wrap',
                }}
              >
                <span>Applied {formatDate(app.applied_at)}</span>
                <span>Updated {formatDate(app.stage_changed_at)}</span>
                {app.source && <span>via {app.source}</span>}
                {app.match_score != null && (
                  <span
                    style={{
                      color:
                        app.match_score >= 80
                          ? '#10b981'
                          : app.match_score >= 60
                          ? '#f59e0b'
                          : '#ef4444',
                      fontWeight: 700,
                    }}
                  >
                    {Math.round(app.match_score)}% match
                  </span>
                )}
              </div>

              {/* Pipeline bar */}
              {app.stage !== 'rejected' && <StageBar stage={app.stage} />}

              {/* Rejection notice */}
              {app.stage === 'rejected' && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(239,68,68,0.07)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    fontSize: 12,
                    color: '#ef4444',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Application not moved forward
                  {app.rejection_reason ? ` · ${app.rejection_reason}` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
