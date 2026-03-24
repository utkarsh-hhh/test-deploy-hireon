import { useQuery } from '@tanstack/react-query'
import { formatDateTime, timeAgo } from '@/utils/formatters'
// Example if backend has the notifications endpoint at /v1/notifications
import api from '@/api/axios'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export default function PortalNotifications() {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['portal', 'notifications'],
    queryFn: () => api.get<Notification[]>('/v1/notifications').then(r => r.data),
    refetchInterval: 30_000,
  })

  // Group notifications loosely by simple date (today vs older)
  const sorted = [...(notifications || [])].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const markAllRead = () => {
    // Optimistically mark all as read or call backend
    alert("In a real app, this marks all as read.");
  }

  function getIcon(type: string) {
    if (type.includes('interview')) return { ico: '📅', color: 'n-blue' }
    if (type.includes('offer')) return { ico: '🎉', color: 'n-green' }
    if (type.includes('reminder')) return { ico: '⚠️', color: 'n-amber' }
    return { ico: '🔔', color: 'n-violet' }
  }

  return (
    <div className="page active" id="page-notif">
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="pt">Notifications 🔔</div>
            <div className="ps">Stay updated on your application status and messages from the team.</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={markAllRead}>Mark All as Read</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading ? (
          <div className="py-8 text-center text-[var(--text-lite)]">Loading notifications...</div>
        ) : !sorted.length ? (
          <div className="py-12 text-center text-[var(--text-lite)]">
             <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
             <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>All caught up!</div>
             <div style={{ fontSize: 13 }}>You have no new notifications.</div>
          </div>
        ) : (
          sorted.map(n => {
            const { ico, color } = getIcon(n.type)
            return (
              <div className={`notif-card ${!n.is_read ? 'unread' : ''}`} key={n.id}>
                <div className={`n-ico ${color}`}>{ico}</div>
                <div className="n-core">
                  <div className="n-title">{n.title}</div>
                  <div className="n-desc">{n.message}</div>
                  <div className="n-time">{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && <div className="n-read" title="Mark as read"></div>}
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
