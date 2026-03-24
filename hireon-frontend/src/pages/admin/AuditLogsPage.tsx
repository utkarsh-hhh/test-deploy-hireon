import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { adminApi } from '@/api/admin'
import { Skeleton } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'
import { formatDateTime } from '@/utils/formatters'

const ACTION_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  CREATE:          { bg: 'rgba(16,185,129,0.10)',  color: '#059669', label: 'Create' },
  UPDATE_STAGE:    { bg: 'rgba(108,71,255,0.10)',  color: '#6c47ff', label: 'Stage Update' },
  SCHEDULE:        { bg: 'rgba(108,71,255,0.10)',  color: '#6c47ff', label: 'Schedule' },
  UPDATE:          { bg: 'rgba(59,130,246,0.10)',  color: '#2563eb', label: 'Update' },
  DELETE:          { bg: 'rgba(239,68,68,0.10)',   color: '#dc2626', label: 'Delete' },
  INVITE:          { bg: 'rgba(255,107,198,0.10)', color: '#db2777', label: 'Invite' },
  LOGIN:           { bg: 'rgba(16,185,129,0.10)',  color: '#059669', label: 'Login' },
  LOGOUT:          { bg: 'rgba(107,114,128,0.10)', color: '#6b7280', label: 'Logout' },
  OFFER_SENT:      { bg: 'rgba(251,191,36,0.10)',  color: '#d97706', label: 'Offer Sent' },
  OFFER_RESPONDED: { bg: 'rgba(59,130,246,0.10)',  color: '#2563eb', label: 'Offer Response' },
}

const RESOURCE_ICON: Record<string, string> = {
  job: '💼', candidate: '👤', interview: '📅', offer: '📝', user: '👥', organization: '🏢', application: '📋',
}

const ACTION_FILTERS = ['', 'CREATE', 'UPDATE_STAGE', 'SCHEDULE', 'UPDATE', 'DELETE', 'INVITE', 'LOGIN', 'OFFER_SENT']
const RESOURCE_FILTERS = ['', 'job', 'candidate', 'interview', 'offer', 'user', 'organization']

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [resourceType, setResourceType] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', page, action, resourceType],
    queryFn: () =>
      adminApi.auditLogs({ page, limit: 20, action: action || undefined, resource_type: resourceType || undefined }).then((r) => r.data),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Audit Logs
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-light)' }}>
          Complete history of all actions taken in your organisation
          {data && <span style={{ marginLeft: 8, fontWeight: 700, color: 'var(--violet)' }}> · {data.total} total</span>}
        </p>
      </div>

      {/* Action filter pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ACTION_FILTERS.map(a => (
            <button key={a || 'all-actions'}
              onClick={() => { setAction(a); setPage(1) }}
              style={{
                padding: '5px 14px', borderRadius: 20, border: '1px solid',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                background: action === a ? 'rgba(108,71,255,0.1)' : 'var(--kpi-bg)',
                color: action === a ? 'var(--violet)' : 'var(--text-mid)',
                borderColor: action === a ? 'rgba(108,71,255,0.3)' : 'var(--table-border)',
              }}
            >
              {a ? (ACTION_STYLE[a]?.label ?? a) : 'All Actions'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RESOURCE_FILTERS.map(r => (
            <button key={r || 'all-resources'}
              onClick={() => { setResourceType(r); setPage(1) }}
              style={{
                padding: '5px 14px', borderRadius: 20, border: '1px solid',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                background: resourceType === r ? 'rgba(16,185,129,0.08)' : 'var(--kpi-bg)',
                color: resourceType === r ? '#059669' : 'var(--text-mid)',
                borderColor: resourceType === r ? 'rgba(16,185,129,0.25)' : 'var(--table-border)',
              }}
            >
              {r ? `${RESOURCE_ICON[r] ?? ''} ${r.charAt(0).toUpperCase() + r.slice(1)}` : 'All Resources'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 20px', borderRadius: 12, background: 'var(--kpi-bg)', border: '1px solid var(--table-border)', alignItems: 'center' }}>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div style={{ borderRadius: 12, padding: 16, fontSize: 13, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.20)', color: '#ef4444' }}>
          Failed to load audit logs.
        </div>
      ) : !data?.items.length ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <span style={{ fontSize: 36 }}>📋</span>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 12 }}>No audit logs found</p>
          <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>
            {action || resourceType ? 'Try adjusting your filters' : 'Actions will be logged here automatically'}
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '150px 110px 1fr 180px 160px', gap: 12, padding: '0 20px', fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            <span>Action</span><span>Resource</span><span>Details</span><span>By</span><span>When</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.items.map((log: any, i: number) => {
              const as = ACTION_STYLE[log.action] ?? { bg: 'rgba(107,114,128,0.10)', color: '#6b7280', label: log.action }
              const detailStr = log.details
                ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')
                : ''
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  style={{
                    display: 'grid', gridTemplateColumns: '150px 110px 1fr 180px 160px',
                    gap: 12, alignItems: 'center', padding: '12px 20px',
                    borderRadius: 12, background: 'var(--kpi-bg)', border: '1px solid var(--table-border)',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,71,255,0.25)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--table-border)' }}
                >
                  {/* Action badge */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: as.bg, color: as.color, width: 'fit-content' }}>
                    {as.label}
                  </span>

                  {/* Resource */}
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)' }}>
                    {RESOURCE_ICON[log.resource_type] ?? ''} {log.resource_type ? log.resource_type.charAt(0).toUpperCase() + log.resource_type.slice(1) : '—'}
                  </span>

                  {/* Details */}
                  <span style={{ fontSize: 12, color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={detailStr}>
                    {detailStr || (log.resource_id ? `ID: ${log.resource_id.slice(0, 8)}…` : '—')}
                  </span>

                  {/* User name */}
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.user_name ?? <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>system</span>}
                  </span>

                  {/* Timestamp */}
                  <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
                    {formatDateTime(log.created_at)}
                  </span>
                </motion.div>
              )
            })}
          </div>

          <Pagination page={data.page} pages={data.pages} total={data.total} limit={data.limit} onPage={setPage} />
        </>
      )}
    </div>
  )
}
