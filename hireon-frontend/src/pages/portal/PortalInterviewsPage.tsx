import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/api/portal'
import { useNavigate } from 'react-router-dom'
import type { Interview } from '@/types'

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.setHours(0,0,0,0) === now.setHours(0,0,0,0)
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  let hours = d.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const mins = d.getMinutes().toString().padStart(2, '0')
  return { hr: `${hours}:${mins}`, ampm, dt: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
}

function InterviewCard({ interview }: { interview: Interview }) {
  const navigate = useNavigate()
  const today = interview.status === 'scheduled' && isToday(interview.scheduled_at)
  const t = formatTime(interview.scheduled_at)
  
  let cardClass = 'int-card ic-up'
  if (today) cardClass = 'int-card ic-live'
  if (interview.status !== 'scheduled') cardClass = 'int-card ic-done'

  const isPassed = interview.status === 'completed' || (interview.status as string) === 'passed'
  const isFailed = interview.status === 'cancelled' || (interview.status as string) === 'failed'

  const panelists = interview.panelists?.map(p => p.user_name || p.user_email).join(', ') || 'TBD'
  
  return (
    <div className={cardClass} style={interview.status !== 'scheduled' ? { opacity: 0.75 } : {}}>
      <div className="int-time">
        <div className="int-hr" style={interview.status !== 'scheduled' ? { color: 'var(--text-lite)' } : {}}>{t.hr.split(':')[0]}</div>
        <div className="int-ampm">{t.hr.split(':')[1]} {t.ampm}</div>
        <div className="int-dt">{today ? 'Today' : t.dt}</div>
      </div>
      
      <div className="int-info">
        <div className="int-title">{interview.title}</div>
        <div className="int-round">{interview.interview_type.replace(/_/g, ' ')} · {interview.duration_minutes} min {interview.status !== 'scheduled' && `· Completed ✅`}</div>
        
        <div className="int-meta">
          <div className="int-meta-item">👤 <span>Panel: {panelists}</span></div>
          <div className="int-meta-item">⏱️ <span>{interview.duration_minutes} minutes</span></div>
        </div>

        {interview.meeting_link && interview.status === 'scheduled' ? (
          <div className="int-link">🎥 <a href={interview.meeting_link} target="_blank" rel="noreferrer">Join Meeting</a></div>
        ) : interview.location && interview.status === 'scheduled' ? (
          <div className="int-link">📍 {interview.location}</div>
        ) : null}

        {interview.notes && (
          <div style={{ fontSize: 11, color: 'var(--text-lite)', marginTop: 4, fontStyle: 'italic' }}>
            {interview.notes}
          </div>
        )}
      </div>

      <div className="int-actions">
        {interview.status === 'scheduled' ? (
          <>
            {interview.meeting_link && (
              <a href={interview.meeting_link} target="_blank" rel="noreferrer" className="btn btn-teal btn-sm" style={{ textDecoration: 'none' }}>
                Join Meet
              </a>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/portal/prep')}>🎯 Prep Kit</button>
          </>
        ) : (
          <>
            {isPassed && <span className="chip chip-green" style={{ fontSize: 11 }}>Passed ✓</span>}
            {isFailed && <span className="chip chip-gray" style={{ fontSize: 11 }}>{interview.status}</span>}
          </>
        )}
      </div>
    </div>
  )
}

export default function PortalInterviewsPage() {
  const { data: interviews, isLoading, isError } = useQuery({
    queryKey: ['portal', 'interviews'],
    queryFn: () => portalApi.myInterviews().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const todayInterviews = interviews?.filter((i) => i.status === 'scheduled' && isToday(i.scheduled_at)) ?? []
  const upcoming = interviews
    ?.filter((i) => i.status === 'scheduled' && !isToday(i.scheduled_at))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()) ?? []
  const past = interviews
    ?.filter((i) => i.status !== 'scheduled')
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()) ?? []

  return (
    <div className="page active">
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="pt">My Interview Schedule 📅</div>
            <div className="ps">All your upcoming and past interviews in one place.</div>
          </div>
          {todayInterviews.length > 0 && <span className="chip chip-teal"><span className="chd"></span>{todayInterviews.length} Interview{todayInterviews.length > 1 ? 's' : ''} Today</span>}
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center" style={{ color: 'var(--text-lite)' }}>Loading interviews...</div>
      ) : isError ? (
        <div className="py-8 text-center" style={{ color: 'var(--red)' }}>Failed to load interviews.</div>
      ) : !interviews?.length ? (
        <div className="py-12 text-center" style={{ color: 'var(--text-lite)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>No interviews scheduled</div>
          <div style={{ fontSize: 13 }}>When an interviewer schedules you, it will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {todayInterviews.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal)', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block', animation: 'blink 2s infinite' }}></span>
                Today
              </div>
              {todayInterviews.map((iv) => <InterviewCard key={iv.id} interview={iv} />)}
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>
                Upcoming
              </div>
              {upcoming.map((iv) => <InterviewCard key={iv.id} interview={iv} />)}
            </>
          )}

          {past.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-lite)', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>
                Completed
              </div>
              {past.map((iv) => <InterviewCard key={iv.id} interview={iv} />)}
            </>
          )}
          
        </div>
      )}
    </div>
  )
}
