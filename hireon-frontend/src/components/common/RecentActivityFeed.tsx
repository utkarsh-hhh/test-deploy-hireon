import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { activitiesApi } from '@/api/activities'
import { Skeleton } from '@/components/ui/Skeleton'

const ACTIVITY_CONFIG: Record<string, { icon: string; bg: string }> = {
  CREATE:          { icon: '➕', bg: 'rgba(16, 185, 129, 0.1)' },
  UPDATE_STAGE:    { icon: '📈', bg: 'rgba(108, 71, 255, 0.1)' },
  SCHEDULE:        { icon: '📅', bg: 'rgba(108, 71, 255, 0.1)' },
  OFFER_SENT:      { icon: '📨', bg: 'rgba(251, 191, 36, 0.1)' },
  OFFER_RESPONDED: { icon: '🤝', bg: 'rgba(59, 130, 246, 0.1)' },
  INVITE:          { icon: '✉️', bg: 'rgba(255, 107, 198, 0.1)' },
  default:         { icon: '🔔', bg: 'rgba(108, 71, 255, 0.1)' },
}

function buildLabel(act: { action: string; resource_type: string; details: any }): { title: string; sub: string } {
  const { action, resource_type, details } = act
  if (resource_type === 'job' && action === 'CREATE') {
    return { title: `New Job — ${details?.title ?? 'Untitled'}`, sub: 'Position posted' }
  }
  if (resource_type === 'candidate' && action === 'CREATE') {
    return { title: `New Candidate — ${details?.name ?? ''}`, sub: 'Added to pipeline' }
  }
  if (action === 'UPDATE_STAGE') {
    return { title: `Pipeline Update — ${details?.name ?? ''}`, sub: `${details?.from ?? '—'} → ${details?.to ?? '—'}` }
  }
  if (action === 'SCHEDULE') {
    return { title: `Interview Scheduled — ${details?.candidate ?? ''}`, sub: details?.title ?? '' }
  }
  if (action === 'OFFER_SENT') {
    return { title: `Offer Sent — ${details?.position ?? ''}`, sub: 'Awaiting response' }
  }
  if (action === 'OFFER_RESPONDED') {
    return { title: `Offer Response — ${details?.position ?? ''}`, sub: details?.status ?? '' }
  }
  if (action === 'INVITE') {
    return { title: `Invite Sent — ${details?.name ?? ''}`, sub: details?.email ?? '' }
  }
  return { title: action.replace(/_/g, ' '), sub: resource_type }
}

export function RecentActivityFeed({ limit = 10 }: { limit?: number }) {
  const { data: activities = [], isLoading, isError } = useQuery({
    queryKey: ['recent-activities', limit],
    queryFn: () => activitiesApi.list(limit).then((r) => r.data),
    refetchInterval: 8_000,
    staleTime: 0,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-4 border-b border-[rgba(108,71,255,0.05)]">
            <Skeleton className="w-10 h-10 rounded-[12px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError || activities.length === 0) {
    return (
      <div className="py-10 text-center">
        <span className="text-2xl mb-2 block">📭</span>
        <p className="text-[13px] font-medium text-[var(--text-light)]">
          {isError ? 'Could not load activity.' : 'No recent activity to show.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map((act) => {
        const config = ACTIVITY_CONFIG[act.action] ?? ACTIVITY_CONFIG.default
        const { title, sub } = buildLabel(act)
        return (
          <div key={act.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 border-b last:border-0" style={{ borderColor: 'rgba(108, 71, 255, 0.05)' }}>
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[16px] flex-shrink-0" style={{ background: config.bg }}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate text-[var(--text)]">{title}</p>
              {sub && <p className="text-[11px] font-medium truncate text-[var(--text-light)]">{sub}</p>}
            </div>
            <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: '#c4b9de' }}>
              {formatDistanceToNow(new Date(act.created_at), { addSuffix: true }).replace('about ', '')}
            </span>
          </div>
        )
      })}
    </div>
  )
}
