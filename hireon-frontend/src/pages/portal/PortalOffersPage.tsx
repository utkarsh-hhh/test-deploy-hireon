import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { portalApi } from '@/api/portal'
import type { Offer } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatDate, formatSalary } from '@/utils/formatters'

function DeclineModal({
  offer,
  onClose,
  onConfirm,
  loading,
}: {
  offer: Offer
  onClose: () => void
  onConfirm: (reason: string) => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <Modal open onClose={onClose} title="Decline Offer" size="sm">
      <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 14 }}>
        Are you sure you want to decline the offer for <strong>{offer.position_title}</strong>?
      </p>
      <Textarea
        label="Reason (optional)"
        placeholder="Let the recruiter know why you're declining..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
      />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          style={{ background: 'var(--red)' }}
          onClick={() => onConfirm(reason)}
          disabled={loading}
        >
          {loading ? 'Declining…' : 'Decline Offer'}
        </button>
      </div>
    </Modal>
  )
}

function CtcRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
      borderRadius: 10, background: highlight ? 'rgba(124,58,237,0.07)' : 'rgba(124,58,237,0.03)',
      borderBottom: '1px solid rgba(124,58,237,0.06)', marginBottom: 4,
    }}>
      <span style={{ fontSize: 13, color: highlight ? 'var(--text)' : 'var(--text-mid)', fontWeight: highlight ? 700 : 500 }}>
        {label}
      </span>
      <span style={{
        fontSize: highlight ? 16 : 14, fontWeight: highlight ? 700 : 600,
        color: highlight ? 'var(--brand)' : 'var(--text)',
        fontFamily: highlight ? "'DM Serif Display', serif" : "'Space Grotesk', sans-serif"
      }}>
        {value}
      </span>
    </div>
  )
}

function OfferCard({
  offer,
  onAccept,
  onDecline,
}: {
  offer: Offer
  onAccept: () => void
  onDecline: () => void
}) {
  const isPending = offer.status === 'sent'
  const isAccepted = offer.status === 'accepted'
  const isDeclined = offer.status === 'declined'

  const total = (offer.base_salary ?? 0) + (offer.bonus ?? 0)

  return (
    <div className="card" style={{ padding: isPending ? 0 : 20, overflow: 'hidden' }}>
      
      {isPending && (
        <div className="offer-banner">
          <div className="ob-bg"></div><div className="ob-bg ob-bg2"></div>
          <div className="ob-content">
            <div className="ob-tag">✨ Pending Offer</div>
            <div className="ob-title">{offer.position_title}</div>
            <div className="ob-sub">
              {formatSalary(offer.base_salary, null, offer.salary_currency)} / year {offer.equity ? '· Plus Equity' : ''}
            </div>
            {offer.expiry_date && (
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                Expires {formatDate(offer.expiry_date)}
              </div>
            )}
            <div className="ob-actions">
              <button className="btn btn-primary" style={{ background: 'var(--green)', boxShadow: '0 4px 14px rgba(16,185,129,.3)' }} onClick={onAccept}>Accept Offer</button>
              <button className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,.3)', color: '#fff' }} onClick={onDecline}>Decline</button>
              {offer.pdf_url && (
                <a href={offer.pdf_url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ color: '#fff', textDecoration: 'none' }}>
                  📄 View PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: isPending ? 24 : 0 }}>
        {!isPending && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{offer.position_title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-lite)' }}>Status: <span style={{ textTransform: 'capitalize', color: isAccepted ? 'var(--green)' : isDeclined ? 'var(--red)' : '' }}>{offer.status}</span></div>
            </div>
            {offer.pdf_url && (
              <a href={offer.pdf_url} className="btn btn-outline btn-sm" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                📄 PDF
              </a>
            )}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <div className="ctitle" style={{ fontSize: 12, letterSpacing: '1px' }}>COMPENSATION BREAKDOWN</div>
          <CtcRow label="Base Salary" value={formatSalary(offer.base_salary, null, offer.salary_currency)} />
          {offer.bonus != null && <CtcRow label="Bonus" value={formatSalary(offer.bonus, null, offer.salary_currency)} />}
          {offer.equity && <CtcRow label="Equity" value={offer.equity} />}
          {offer.start_date && <CtcRow label="Start Date" value={formatDate(offer.start_date)} />}
          {(offer.bonus != null || offer.equity) && (
            <CtcRow label="Total CTC (excl. equity)" value={formatSalary(total, null, offer.salary_currency)} highlight />
          )}
        </div>

        {offer.benefits && (
          <div style={{ marginBottom: 18 }}>
            <div className="ctitle" style={{ fontSize: 12, letterSpacing: '1px' }}>BENEFITS</div>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>{offer.benefits}</p>
          </div>
        )}

        {isAccepted && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)', color: 'var(--green)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🎉</span> Accepted on {formatDate(offer.responded_at as string)}
          </div>
        )}

        {isDeclined && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)', fontSize: 13, color: 'var(--red)' }}>
            Declined on {formatDate(offer.responded_at as string)}
            {offer.decline_reason && <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>Reason: {offer.decline_reason}</div>}
          </div>
        )}
      </div>

    </div>
  )
}

export default function PortalOffersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [acceptTarget, setAcceptTarget] = useState<Offer | null>(null)
  const [declineTarget, setDeclineTarget] = useState<Offer | null>(null)

  // Gate: check if the candidate has reached HR round
  const OFFER_ELIGIBLE_STAGES = [
    'hr_round_selected', 'offered', 'offer', 'hired', 'hired_joined',
    'offered_back_out', 'offer_withdrawn',
  ]
  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['portal', 'applications'],
    queryFn: () => portalApi.myApplications().then((r) => r.data),
    refetchInterval: 30_000,
  })
  const offersUnlocked = applications?.some(
    (a: any) => OFFER_ELIGIBLE_STAGES.includes(a.stage) || OFFER_ELIGIBLE_STAGES.includes(a.candidate?.pipeline_stage)
  ) ?? false

  const { data: offers, isLoading, isError } = useQuery({
    queryKey: ['portal', 'offers'],
    queryFn: () => portalApi.myOffers().then((r) => r.data),
    refetchInterval: 30_000,
    enabled: offersUnlocked,
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, accept, reason }: { id: string; accept: boolean; reason?: string }) =>
      portalApi.respondOffer(id, accept, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'offers'] })
      setAcceptTarget(null)
      setDeclineTarget(null)
      alert('Offer status updated.')
    },
    onError: () => alert('Failed to respond to offer.'),
  })

  // Has accepted offer? Check if we should render doc tracker section.
  const hasAccepted = offers?.some(o => o.status === 'accepted') || false;

  // Silently redirect if not yet eligible
  useEffect(() => {
    if (!appsLoading && !offersUnlocked) {
      navigate('/portal', { replace: true })
    }
  }, [appsLoading, offersUnlocked, navigate])

  return (
    <div className="page active">
      <div className="ph">
        <div className="pt">Offer &amp; Documents 📄</div>
        <div className="ps">Review pending offers and complete your pre-joining documents.</div>
      </div>

      {offersUnlocked && (
        <div className="g2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {isLoading ? (
               <div className="py-8 text-[var(--text-lite)]">Loading offers...</div>
            ) : isError ? (
               <div className="py-8 text-[var(--red)]">Failed to load offers.</div>
            ) : offers?.length === 0 ? (
               <div className="card py-12 text-center text-[var(--text-lite)]">
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>No offers yet</div>
                  <div style={{ fontSize: 13 }}>When a company extends you an offer, it will appear here.</div>
               </div>
            ) : (
              offers?.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onAccept={() => setAcceptTarget(offer)}
                  onDecline={() => setDeclineTarget(offer)}
                />
              ))
            )}
          </div>

          {/* Right Column: Required Documents */}
          <div>
            <div className="card">
              <div className="ctitle">
                Required Documents 
                {hasAccepted ? <span className="ctag amber">Action Needed</span> : <span className="ctag gray">Locked</span>}
              </div>
              
              {hasAccepted ? (
                <div className="doc-list">
                  <div className="doc-item">
                    <div className="doc-ico">📄</div>
                    <div className="doc-info">
                      <div className="doc-name">Signed Offer Letter</div>
                      <div className="doc-meta">Requires signature</div>
                    </div>
                    <span className="chip chip-amber"><span className="chd"></span>Pending</span>
                  </div>
                  
                  <div className="doc-item">
                    <div className="doc-ico">🏦</div>
                    <div className="doc-info">
                      <div className="doc-name">Bank Details Form</div>
                      <div className="doc-meta">For payroll processing</div>
                    </div>
                    <span className="chip chip-green"><span className="chd"></span>Done</span>
                  </div>

                  <div className="doc-item">
                    <div className="doc-ico">🪪</div>
                    <div className="doc-info">
                      <div className="doc-name">Government ID</div>
                      <div className="doc-meta">Aadhar / PAN / Passport</div>
                    </div>
                    <span className="chip chip-amber"><span className="chd"></span>Upload</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-[13px] text-[var(--text-lite)] px-2">
                  Document collection will unlock once you accept a job offer.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!acceptTarget}
        onClose={() => setAcceptTarget(null)}
        onConfirm={() => acceptTarget && respondMutation.mutate({ id: acceptTarget.id, accept: true })}
        title="Accept Offer"
        message={`Are you sure you want to accept the offer for "${acceptTarget?.position_title}"?`}
        confirmText="Accept Offer"
        loading={respondMutation.isPending}
      />

      {declineTarget && (
        <DeclineModal
          offer={declineTarget}
          onClose={() => setDeclineTarget(null)}
          onConfirm={(reason) => respondMutation.mutate({ id: declineTarget.id, accept: false, reason })}
          loading={respondMutation.isPending}
        />
      )}
    </div>
  )
}
