import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { portalApi } from '@/api/portal'

interface Flashcard {
  topic: string
  question: string
  answer: string
}

export default function PortalPrepHub() {
  const [activeQuestion, setActiveQuestion] = useState(0)

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['portal', 'applications'],
    queryFn: () => portalApi.myApplications().then(r => r.data),
    refetchInterval: 30_000,
  })

  // We fetch interviews to get the "Next Interview" info for the header
  const { data: interviews } = useQuery({
    queryKey: ['portal', 'interviews'],
    queryFn: () => portalApi.myInterviews().then(r => r.data),
    refetchInterval: 30_000,
  })

  // Find the most relevant upcoming interview (today onwards)
  let nextInterview = null
  if (interviews && interviews.length > 0) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const upcoming = interviews
      .filter((i: any) => new Date(i.scheduled_at) >= todayStart && i.status !== 'cancelled')
      .sort((a: any, b: any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      
    if (upcoming.length > 0) {
      nextInterview = upcoming[0]
    }
  }

  // Tie active application to the next interview if one exists
  const activeAppId = nextInterview?.application_id 
    ? nextInterview.application_id 
    : (applications?.find((a: any) => !['hired', 'rejected'].includes(a.stage))?.id || applications?.[0]?.id)
    
  const activeApp = applications?.find((a: any) => a.id === activeAppId)

  const { data: prepData, isLoading: prepLoading } = useQuery({
    queryKey: ['portal', 'prep', activeApp?.id],
    queryFn: () => portalApi.generatePrep(activeApp!.id).then(r => r.data),
    enabled: !!activeApp,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const rawFlashcards = prepData?.flashcards || []
  const focusAreas = prepData?.focus_areas || []

  // Normalize
  const flashcards: Flashcard[] = rawFlashcards.map((fc: any) => ({
    topic: fc.category || fc.topic || "Prep",
    question: fc.question,
    answer: fc.answer || (fc.key_points ? fc.key_points.join(" • ") : fc.hint || "Review key concepts.")
  }))

  const nextInterviewDate = nextInterview ? new Date(nextInterview.scheduled_at) : null
  const timeStr = nextInterviewDate ? nextInterviewDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ""
  const dateStr = nextInterviewDate ? `${nextInterviewDate.getMonth() + 1}/${nextInterviewDate.getDate()}/${nextInterviewDate.getFullYear()}` : ""
  const titleStr = nextInterview?.title || activeApp?.job?.title || "Specific Round"

  if (appsLoading) {
    return <div className="p-8 text-center text-[var(--text-lite)]">Loading Prep Hub...</div>
  }

  if (!activeApp) {
    return (
      <div className="page active">
        <div className="ph">
          <div className="pt">Interview Prep Hub 🎯</div>
          <div className="ps">Apply for a job to unlock tailored prep materials.</div>
        </div>
      </div>
    )
  }

  const currentQ = flashcards[activeQuestion]

  const handleNextQ = () => {
    if (flashcards.length > 0) {
      setActiveQuestion((prev) => (prev + 1) % flashcards.length)
    }
  }

  const getPriorityInfo = (idx: number) => {
    const priorities = [
      { text: "High Priority", bar: "80%" },
      { text: "High Priority", bar: "65%" },
      { text: "Medium", bar: "45%" },
      { text: "Medium", bar: "30%" }
    ]
    return priorities[idx % priorities.length]
  }

  return (
    <div className="page active" id="page-prep">
      
      {/* HEADER SECTION MATCHING MOCKUP */}
      <div className="prep-header">
        <div>
          <div className="pt">Interview Prep Hub 🎯</div>
          <div className="ps">AI-generated tips, questions, and flashcards — tailored for your {titleStr} interview.</div>
        </div>
        {nextInterview && (
          <div className="prep-next-btn">
            <div className="prep-next-l">NEXT INTERVIEW</div>
            <div className="prep-next-time">{timeStr}</div>
            <div className="prep-next-sub">{dateStr} &middot; {titleStr}</div>
          </div>
        )}
      </div>

      {prepLoading && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--primary)', marginBottom: 24 }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>✨</div>
          <div style={{ fontWeight: 600 }}>Analyzing your resume and generating personalized prep questions...</div>
          <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 8 }}>This might take a few seconds.</div>
        </div>
      )}

      {flashcards.length > 0 && currentQ && (
        <div className="prep-hero" onClick={handleNextQ}>
          <div className="phero-tag">QUESTION {activeQuestion + 1} OF {flashcards.length} · {currentQ.topic}</div>
          <div className="phero-q">{currentQ.question}</div>
          <div className="phero-foot">Tap to see next question &rarr;</div>
        </div>
      )}

      {!prepLoading && (flashcards.length > 0 || focusAreas.length > 0) && (
        <div className="prep-cols">
          
          {/* LEFT COL: Topics to Prepare */}
          <div className="prep-col-card">
            <div className="pcc-head">
              <div className="pcc-title">Topics to Prepare</div>
              <div className="ctag violet">Role Specific</div>
            </div>
            <div className="pcc-list">
              {focusAreas.length > 0 ? focusAreas.map((area: any, idx: number) => {
                const pri = getPriorityInfo(idx)
                return (
                  <div key={idx} className="ptopic-item">
                    <div className="pti-top">
                      <div className="pti-name">
                        <div className="pti-ico">💡</div>
                        {area.topic}
                      </div>
                      <div className="pti-pri">{pri.text}</div>
                    </div>
                    <div className="pti-bar-wrap">
                      <div className="pti-bar" style={{ width: pri.bar }}></div>
                    </div>
                    <div className="pti-sub">AI Recommended Focus</div>
                  </div>
                )
              }) : (
                <div className="text-[var(--text-lite)] text-sm">No specific topics generated.</div>
              )}
            </div>
          </div>

          {/* RIGHT COL: AI Practice Questions */}
          <div className="prep-col-card">
            <div className="pcc-head">
              <div className="pcc-title">AI Practice Questions</div>
            </div>
            <div className="pcc-list">
              {flashcards.map((card, idx) => (
                <div key={idx} className="pprac-item">
                  <div className="ppi-ico">✨</div>
                  <div className="ppi-content">
                    <div className="ppi-q">{card.question}</div>
                    <div className="ppi-tag">{card.topic}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Fallback if somehow no prep data could be generated and not loading */}
      {!flashcards.length && !prepLoading && (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-mid)', marginBottom: 20 }}>
          No prep materials available.
        </div>
      )}

    </div>
  )
}
