import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { offersApi } from '@/api/offers'
import api from '@/api/axios'
import type { Offer } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { OfferStatusBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { formatDate, formatSalary } from '@/utils/formatters'

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${
        type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
      }`}
    >
      {message}
    </motion.div>
  )
}

const createSchema = z.object({
  application_id: z.string().min(1, 'Application ID required'),
  position_title: z.string().min(1, 'Position title required'),
  base_salary: z.coerce.number().min(1, 'Salary required'),
  salary_currency: z.string().default('USD'),
  bonus: z.coerce.number().nullable().optional(),
  equity: z.string().optional(),
  start_date: z.string().optional(),
  expiry_date: z.string().optional(),
  benefits: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

const CURRENCIES = [
  { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' }, { value: 'INR', label: 'INR' },
]

function CreateOfferModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({ 
    resolver: zodResolver(createSchema), 
    defaultValues: { salary_currency: 'USD', position_title: '' } 
  })

  // Fetch applications for the dropdown - broadening to all to ensure we find candidates
  const { data: applicationsPaged, isLoading: loadingApps } = useQuery({
    queryKey: ['applications-for-offer'],
    queryFn: () => api.get<{ items: any[] }>('/v1/applications?limit=100').then(r => r.data).catch(() => ({ items: [] })),
    refetchInterval: 30_000,
  })

  const selectedAppId = watch('application_id')

  const applicationOptions = useMemo(() => {
    if (!applicationsPaged?.items) return [{ value: '', label: 'Loading candidates...' }]
    
    // Map of detailed stages to relevant buckets for offer creation
    const OFFER_RELEVANT_STAGES = [
      'hired', 'hired_joined',                // Hired
      'offer', 'offered',                     // Offer
      'interview', 'interviewed', 'hr_round_selected',       // Interview/Final
      'management_round_selected', 
      'technical_round_selected'
    ]

    // Filter for candidates in relevant stages
    const relevantApps = applicationsPaged.items.filter(app => {
      const stage = (app.stage || '').toLowerCase()
      const candStage = (app.candidate?.pipeline_stage || '').toLowerCase()
      
      return OFFER_RELEVANT_STAGES.includes(stage) || OFFER_RELEVANT_STAGES.includes(candStage)
    })

    if (relevantApps.length === 0) {
      return [{ value: '', label: 'No candidates in Interview/Offer/Hired stage' }]
    }

    return [
      { value: '', label: 'Select a candidate...' },
      ...relevantApps.map(app => ({
        value: app.id,
        label: `${app.candidate?.full_name || 'Unknown'} - ${app.job?.title || 'Unknown Job'} (${app.id.slice(-6)})`
      }))
    ]
  }, [applicationsPaged])

  // Automatically set position title when application is selected
  useEffect(() => {
    if (selectedAppId && applicationsPaged?.items) {
      const selected = applicationsPaged.items.find(app => app.id === selectedAppId)
      if (selected?.job?.title) {
        setValue('position_title', selected.job.title)
      }
    }
  }, [selectedAppId, applicationsPaged, setValue])

  const mutation = useMutation({
    mutationFn: (data: CreateForm) => offersApi.create({ ...data, application_id: data.application_id }),
    onSuccess,
  })

  return (
    <Modal open onClose={onClose} title="Draft New Offer" size="xl" hideScrollbar>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="md:col-span-2">
            <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Application Selection</label>
            <div className="grid grid-cols-1 gap-4">
              <Controller
                name="application_id"
                control={control}
                render={({ field }) => (
                  <Select 
                    {...field}
                    options={applicationOptions}
                    error={errors.application_id?.message}
                    disabled={loadingApps}
                  />
                )}
              />
            </div>
          </div>

          <div className="md:col-span-2 h-px bg-gray-100 dark:bg-gray-800 my-2" />

          <div className="md:col-span-2">
            <Input
              label="Position Title"
              placeholder="Detecting automatically..."
              error={errors.position_title?.message}
              {...register('position_title')}
            />
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  label="Base Salary"
                  type="number"
                  placeholder="0.00"
                  error={errors.base_salary?.message}
                  {...register('base_salary')}
                />
              </div>
              <div className="w-32">
                 <Controller
                  name="salary_currency"
                  control={control}
                  render={({ field }) => <Select label="Currency" options={CURRENCIES} {...field} />}
                />
              </div>
            </div>
            <Input label="Annual Bonus" type="number" placeholder="Optional" {...register('bonus')} />
          </div>

          <div className="space-y-4">
            <Input label="Equity Options" placeholder="e.g. 0.5% / 4yr vest" {...register('equity')} />
            <div className="flex gap-3">
              <div className="flex-1">
                <Input label="Start Date" type="date" {...register('start_date')} />
              </div>
              <div className="flex-1">
                <Input label="Expiry Date" type="date" {...register('expiry_date')} />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <Textarea 
              label="Additional Benefits & Perks" 
              placeholder="Health insurance, remote work allowance, learning budget..." 
              rows={3}
              {...register('benefits')} 
            />
          </div>
        </div>

        {mutation.isError && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 rounded-xl text-xs text-red-600 font-bold">
            ⚠️ Error saving offer letter. Please check the application ID and try again.
          </div>
        )}

        <div className="flex gap-3 justify-end mt-10">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <Button 
            type="submit" 
            loading={isSubmitting || mutation.isPending}
            className="px-8 shadow-lg shadow-violet-100 dark:shadow-none"
          >
            Save Draft Offer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function OffersPage() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<Offer | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const { data: offers, isLoading, isError } = useQuery({
    queryKey: ['offers'],
    queryFn: () => offersApi.list().then((r) => r.data),
    refetchInterval: 30_000,
  })

  // Calculate Stats
  const stats = useMemo(() => {
    if (!offers) return { total: 0, accepted: 0, pending: 0, declined: 0 }
    return {
      total: offers.length,
      accepted: offers.filter(o => o.status === 'accepted').length,
      pending: offers.filter(o => ['draft', 'sent'].includes(o.status)).length,
      declined: offers.filter(o => o.status === 'declined').length,
    }
  }, [offers])

  const generatePdfMutation = useMutation({
    mutationFn: (id: string) => offersApi.generatePdf(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      if (res.data.pdf_url) window.open(res.data.pdf_url, '_blank')
      showToast('PDF generated!')
    },
    onError: () => showToast('Failed to generate PDF', 'error'),
  })

  const sendMutation = useMutation({
    mutationFn: (id: string) => offersApi.send(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] })
      showToast('Offer sent to candidate!')
    },
    onError: () => showToast('Failed to send offer', 'error'),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => offersApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      showToast('Offer revoked')
      setRevokeTarget(null)
    },
    onError: () => showToast('Failed to revoke offer', 'error'),
  })

  return (
    <div className="space-y-8 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            Offers
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Draft, send, and track candidate offer letters in one place.</p>
        </div>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r from-[#6c47ff] to-[#8b6bff] text-white shadow-lg shadow-violet-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Offer Letter
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Issued', value: stats.total, color: '#6c47ff', icon: '📝' },
          { label: 'Accepted', value: stats.accepted, color: '#10b981', icon: '✅' },
          { label: 'Pending', value: stats.pending, color: '#f59e0b', icon: '⏳' },
          { label: 'Declined', value: stats.declined, color: '#ef4444', icon: '❌' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900/50 p-5 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{s.icon}</span>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</span>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 w-full rounded-3xl bg-gray-50 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">Failed to load offers. Please refresh to try again.</p>
        </div>
      ) : !offers?.length ? (
        <div className="py-20 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-violet-50 dark:bg-violet-900/20 rounded-full flex items-center justify-center mb-6 text-3xl">📨</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Offers Generated</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">Start your hiring process by creating a new offer letter for your top candidates.</p>
          <Button onClick={() => setShowCreate(true)} variant="outline">Create First Offer</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {offers.map((offer, i) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-white dark:bg-gray-900 p-6 rounded-[28px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-violet-100 dark:hover:border-violet-900/40 transition-all duration-300"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{offer.position_title}</h3>
                    <OfferStatusBadge status={offer.status} />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-violet-500 font-bold">💰</span>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        {formatSalary(offer.base_salary, null, offer.salary_currency)}
                      </span>
                    </div>
                    {offer.start_date && (
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500 font-bold text-xs uppercase tracking-tighter">Start</span>
                        <span className="text-sm font-semibold text-gray-500">{formatDate(offer.start_date)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">ID: {offer.id.slice(-6)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generatePdfMutation.mutate(offer.id)}
                    disabled={generatePdfMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-violet-50 hover:text-violet-600 transition-colors"
                  >
                    {generatePdfMutation.isPending && generatePdfMutation.variables === offer.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>📄</span>
                    )}
                    Generate PDF
                  </button>

                  {offer.status === 'draft' && (
                    <button
                      onClick={() => sendMutation.mutate(offer.id)}
                      disabled={sendMutation.isPending}
                      className="px-6 py-2 text-sm font-bold text-white bg-[#6c47ff] rounded-xl hover:opacity-90 transition-opacity shadow-md shadow-violet-100 dark:shadow-none"
                    >
                      {sendMutation.isPending && sendMutation.variables === offer.id ? 'Sending...' : 'Send Offer'}
                    </button>
                  )}

                  {offer.pdf_url && (
                    <a 
                      href={offer.pdf_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-2 text-gray-400 hover:text-violet-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}

                  {!['declined', 'revoked', 'expired'].includes(offer.status) && (
                    <button
                      onClick={() => setRevokeTarget(offer)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors ml-2"
                      title="Revoke Offer"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateOfferModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['offers'] })
            setShowCreate(false)
            showToast('Offer created successfully!')
          }}
        />
      )}

      <ConfirmModal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
        title="Revoke Offer"
        message={`Revoke the offer for "${revokeTarget?.position_title}"? The candidate will be notified immediately.`}
        confirmText="Confirm Revoke"
        danger
        loading={revokeMutation.isPending}
      />

      <AnimatePresence>
        {toast && <Toast {...toast} />}
      </AnimatePresence>
    </div>
  )
}
