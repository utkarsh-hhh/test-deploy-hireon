import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portalApi } from '@/api/portal'
import { Job, Application } from '@/types'
import toast from 'react-hot-toast'

export default function PortalOpenings() {
  const queryClient = useQueryClient()
  const [referTarget, setReferTarget] = useState<any>(null)
  const [applyTarget, setApplyTarget] = useState<Job | null>(null)

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['portal', 'jobs'],
    queryFn: () => portalApi.jobs().then((r: any) => r.data),
    refetchInterval: 30_000,
  })

  const { data: applications } = useQuery<Application[]>({
    queryKey: ['portal', 'applications'],
    queryFn: () => portalApi.myApplications().then((r: any) => r.data),
    refetchInterval: 30_000,
  })

  // Map of job_id -> boolean to check if user already applied
  const appliedJobIds = new Set(applications?.map((app: Application) => app.job_id))

  const applyMutation = useMutation({
    mutationFn: (jobId: string) => portalApi.applyToJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'applications'] })
      toast.success('Application submitted successfully! 🎉')
      setApplyTarget(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Failed to submit application'
      toast.error(msg)
      setApplyTarget(null)
    },
  })

  return (
    <div className="page active" id="page-openings">
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="pt">Current Openings 🏢</div>
            <div className="ps">Explore other roles or refer a friend to earn rewards!</div>
          </div>
        </div>
      </div>

      {jobsLoading ? (
        <div className="p-8 text-center text-[var(--text-lite)]">Loading openings...</div>
      ) : (jobs?.length === 0) ? (
        <div className="p-8 text-center text-[var(--text-lite)]">No open positions currently available.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {jobs?.map(job => {
            const hasApplied = appliedJobIds.has(job.id)
            const referralBonus = job.title.includes('Senior') ? '$2,000' : '$1,500'

            return (
              <div className="card" key={job.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: "'Fraunces', serif" }}>{job.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-mid)' }}>{job.department || 'General'} · {job.location || 'Remote'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {job.skills_required?.slice(0, 4).map(t => (
                    <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: 'rgba(124,58,237,.06)', color: 'var(--brand)' }}>
                      {t}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  {!hasApplied ? (
                    <>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => setApplyTarget(job)}
                      >
                        Apply Now
                      </button>
                      <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setReferTarget({ ...job, referralBonus })}>Refer a Friend</button>
                    </>
                  ) : (
                    <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} disabled>Applied ✅</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Apply Confirmation Modal */}
      {applyTarget && (
        <Modal open onClose={() => setApplyTarget(null)} title="Confirm Application" size="sm">
          <div style={{ fontSize: 14, color: 'var(--text-mid)', marginBottom: 20, lineHeight: 1.6 }}>
            You are about to apply for <strong style={{ color: 'var(--text)' }}>{applyTarget.title}</strong>.
            <br />
            Your current resume and profile will be submitted to the recruiter.
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-lite)', marginBottom: 20, padding: '10px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.1)' }}>
            💡 Make sure your resume is up to date in your profile before applying.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={() => setApplyTarget(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={() => applyMutation.mutate(applyTarget.id)}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </Modal>
      )}

      {/* Referral Modal */}
      {referTarget && (
        <Modal open onClose={() => setReferTarget(null)} title={`Refer for ${referTarget.title}`} size="md">
          <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 16 }}>
            Know someone perfect for this role? Fill out their details and earn <strong>{referTarget.referralBonus}</strong> if they are hired!
          </p>
          
          <div className="frow" style={{ marginBottom: 12 }}>
            <div>
              <label className="flabel">Friend's Name</label>
              <input className="finput" placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="flabel">Friend's Email</label>
              <input className="finput" placeholder="john@example.com" />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="flabel">LinkedIn Profile (Optional)</label>
            <input className="finput" placeholder="https://linkedin.com/in/..." />
          </div>

          <Textarea
            label="Why are they a good fit?"
            placeholder="Tell us why we should hire your friend..."
            rows={3}
          />
          
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-outline" onClick={() => setReferTarget(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={() => {
                alert(`Successfully referred for ${referTarget.title}!`)
                setReferTarget(null)
              }}
            >
              Submit Referral
            </button>
          </div>
        </Modal>
      )}

    </div>
  )
}
