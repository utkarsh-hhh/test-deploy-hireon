import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { candidatesApi } from '@/api/candidates'
import { jobsApi } from '@/api/jobs'
import type { Candidate } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/utils/formatters'
import { formatDistanceToNow } from 'date-fns'
import { CandidateProfileView } from '@/components/recruiter/CandidateProfileView'

// ─── Stage config (full pipeline) ─────────────────────────────────────────────

const STAGE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  applied:                      { color: '#6c47ff', bg: 'rgba(108,71,255,0.10)', label: 'Applied' },
  screening:                    { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'Screening' },
  interview:                    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Interview' },
  pre_screening:                { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'Pre-screening' },
  technical_round:              { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Technical Round' },
  practical_round:              { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Practical Round' },
  techno_functional_round:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Techno-Functional Round' },
  management_round:             { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Management Round' },
  hr_round:                     { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'HR Round' },
  interviewed:                  { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', label: 'Interviewed' },
  offer:                        { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Offer' },
  hired:                        { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Hired' },
  rejected:                     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Rejected' },
  pre_screening_selected:       { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Pre-screening Selected' },
  pre_screening_rejected:       { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Pre-screening Rejected' },
  technical_round_selected:     { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Technical Round Selected' },
  technical_round_rejected:     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Technical Round Rejected' },
  technical_round_back_out:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Technical Round Back Out' },
  practical_round_selected:     { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Practical Round Selected' },
  practical_round_rejected:     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Practical Round Rejected' },
  practical_round_back_out:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Practical Round Back Out' },
  techno_functional_selected:   { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Techno-Functional Selected' },
  techno_functional_rejected:   { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Techno-Functional Rejected' },
  management_round_selected:    { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Management Round Selected' },
  management_round_rejected:    { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Management Round Rejected' },
  hr_round_selected:            { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'HR Round Selected' },
  hr_round_rejected:            { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'HR Round Rejected' },
  offered:                      { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Offered' },
  offered_back_out:             { color: '#f97316', bg: 'rgba(249,115,22,0.10)', label: 'Offered Back Out' },
  offer_withdrawn:              { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', label: 'Offer Withdrawn' },
  hired_joined:                 { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Hired / Joined' },
  inactive:                     { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', label: 'Inactive' },
  needs_review:                 { color: '#0891b2', bg: 'rgba(8,145,178,0.10)', label: 'Needs Review' },
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  shortlisted: { color: '#059669', bg: 'rgba(16,185,129,0.12)', dot: '#10b981', label: 'Shortlisted' },
  in_review:   { color: '#6c47ff', bg: 'rgba(108,71,255,0.10)', dot: '#6c47ff', label: 'In Review' },
  scheduled:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', dot: '#3b82f6', label: 'Scheduled' },
  rejected:    { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', dot: '#ef4444', label: 'Rejected' },
  inactive:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', dot: '#94a3b8', label: 'Inactive' },
}

const REJECTION_STAGES = [
  'rejected',
  'pre_screening_rejected',
  'technical_round_rejected',
  'technical_round_back_out',
  'practical_round_rejected',
  'practical_round_back_out',
  'techno_functional_rejected',
  'management_round_rejected',
  'hr_round_rejected',
  'offered_back_out',
  'offer_withdrawn'
]

function getStatusFromStage(stage: string | undefined): string {
  if (!stage || stage === 'applied' || stage === 'needs_review') return 'in_review'
  if (stage === 'pre_screening_selected') return 'shortlisted'
  // Any round selected / offered = scheduled (actively moving forward)
  const scheduledStages = [
    'technical_round_selected', 'practical_round_selected',
    'techno_functional_selected', 'management_round_selected',
    'hr_round_selected', 'offered', 'hired', 'hired_joined',
    // neutral stages
    'pre_screening', 'technical_round', 'practical_round',
    'techno_functional_round', 'management_round', 'hr_round',
    // legacy values
    'screening', 'interview', 'interviewed',
  ]
  if (scheduledStages.includes(stage)) return 'scheduled'
  if (stage === 'inactive') return 'inactive'
  if (REJECTION_STAGES.includes(stage)) return 'rejected'
  // fallback
  return 'in_review'
}

function scoreColor(s: number) {
  if (s >= 80) return { text: '#059669', bg: 'rgba(16,185,129,0.12)', track: '#10b981' }
  if (s >= 60) return { text: '#d97706', bg: 'rgba(251,191,36,0.12)', track: '#f59e0b' }
  return { text: '#ef4444', bg: 'rgba(239,68,68,0.10)', track: '#ef4444' }
}

// ─── Full pipeline stage dropdown groups ──────────────────────────────────────

const STAGE_GROUPS = [
  {
    label: 'Pre-Screening',
    icon: '🔍',
    stages: [
      { key: 'pre_screening',            icon: '⏲',  label: 'In Pre-screening' },
      { key: 'pre_screening_selected',   icon: '✅', label: 'Pre-screening Selected' },
      { key: 'pre_screening_rejected',   icon: '✗',  label: 'Pre-screening Rejected' },
    ],
  },
  {
    label: 'Technical Round',
    icon: '💻',
    stages: [
      { key: 'technical_round',          icon: '⏲',  label: 'In Technical Round' },
      { key: 'technical_round_selected', icon: '✅', label: 'Technical Round Selected' },
      { key: 'technical_round_rejected', icon: '✗',  label: 'Technical Round Rejected' },
      { key: 'technical_round_back_out', icon: '↩',  label: 'Technical Round Back Out' },
    ],
  },
  {
    label: 'Practical Round',
    icon: '📝',
    stages: [
      { key: 'practical_round',          icon: '⏲',  label: 'In Practical Round' },
      { key: 'practical_round_selected', icon: '✅', label: 'Practical Round Selected' },
      { key: 'practical_round_rejected', icon: '✗',  label: 'Practical Round Rejected' },
      { key: 'practical_round_back_out', icon: '↩',  label: 'Practical Round Back Out' },
    ],
  },
  {
    label: 'Techno-Functional Round',
    icon: '⚙️',
    stages: [
      { key: 'techno_functional_round',    icon: '⏲',  label: 'In Techno-Functional' },
      { key: 'techno_functional_selected', icon: '✅', label: 'Techno-Functional Selected' },
      { key: 'techno_functional_rejected', icon: '✗',  label: 'Techno-Functional Rejected' },
    ],
  },
  {
    label: 'Management Round',
    icon: '👔',
    stages: [
      { key: 'management_round',          icon: '⏲',  label: 'In Management Round' },
      { key: 'management_round_selected', icon: '✅', label: 'Management Round Selected' },
      { key: 'management_round_rejected', icon: '✗',  label: 'Management Round Rejected' },
    ],
  },
  {
    label: 'HR Round',
    icon: '🤝',
    stages: [
      { key: 'hr_round',          icon: '⏲',  label: 'In HR Round' },
      { key: 'hr_round_selected', icon: '✅', label: 'HR Round Selected' },
      { key: 'hr_round_rejected', icon: '✗',  label: 'HR Round Rejected' },
    ],
  },
  {
    label: 'Offer & Joining',
    icon: '🎉',
    stages: [
      { key: 'offered',           icon: '🏷️', label: 'Offered' },
      { key: 'offered_back_out',  icon: '↩',  label: 'Offered Back Out' },
      { key: 'offer_withdrawn',   icon: '🚫', label: 'Offer Withdrawn' },
      { key: 'hired_joined',      icon: '🎊', label: 'Hired / Joined' },
    ],
  },
]

// ─── Candidate Profile Modal ───────────────────────────────────────────────────

function CandidateProfileModal({ candidate, onClose }: { candidate: Candidate; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Candidate Profile" size="xl">
      <CandidateProfileView candidate={candidate} />
    </Modal>
  )
}

// ─── Score bar pill ───────────────────────────────────────────────────────────

function ScorePill({ score }: { score: number }) {
  const c = scoreColor(score)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: c.text }}>{Math.round(score)}%</span>
      <div style={{ width: 40, height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: c.track, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

// ─── Stage Dropdown ───────────────────────────────────────────────────────────

function CandidateActionsDropdown({
  candidateId,
  currentStage,
  onSelect,
  onDelete,
  onInactivate,
  onClose,
}: {
  candidateId: string
  currentStage: string
  onSelect: (stage: string) => void
  onDelete: (id: string) => void
  onInactivate: (id: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 6 }}
      transition={{ duration: 0.14 }}
      style={{
        position: 'absolute', top: 38, right: 0, zIndex: 9999, width: 260,
        background: 'var(--kpi-bg)', borderRadius: 14,
        boxShadow: '0 16px 48px rgba(0,0,0,0.22)', border: '1px solid var(--table-border)',
        padding: '8px', transformOrigin: 'top right',
        maxHeight: 420, overflowY: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {STAGE_GROUPS.map((group, gi) => {
        return (
          <div key={group.label}>
            {gi > 0 && <div style={{ height: 1, background: 'var(--table-border)', margin: '4px 6px' }} />}
            <p style={{
              fontSize: 9, fontWeight: 800, color: 'var(--text-light)',
              textTransform: 'uppercase', letterSpacing: '0.9px',
              padding: '6px 10px 4px', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span>{group.icon}</span> {group.label}
            </p>
            {group.stages.map((item) => {
              const cfg = STAGE_CFG[item.key] ?? STAGE_CFG.applied
              const isActive = currentStage === item.key
              const isGreen = item.icon === '✅'
              const isRed = item.icon === '✗'
              const iconColor = isGreen ? '#10b981' : isRed ? '#ef4444' : cfg.color
              return (
                <button
                  key={item.key}
                  onClick={(e) => { e.stopPropagation(); onSelect(item.key) }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 9,
                    background: isActive ? cfg.bg : 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: isActive ? 700 : 500, color: isActive ? cfg.color : 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = cfg.bg }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'none' }}
                >
                  <span style={{ fontSize: 11, color: iconColor, fontWeight: 700, minWidth: 12, textAlign: 'center' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isActive && (
                    <span style={{ fontSize: 9, background: cfg.bg, color: cfg.color, borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>Active</span>
                  )}
                </button>
              )
            })}
          </div>
        )
      })}

      <div style={{ height: 1, background: 'var(--table-border)', margin: '4px 6px' }} />
      <p style={{
        fontSize: 9, fontWeight: 800, color: 'var(--text-light)',
        textTransform: 'uppercase', letterSpacing: '0.9px',
        padding: '6px 10px 4px', display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span>⚙️</span> Management
      </p>

      <button
        onClick={(e) => { e.stopPropagation(); onInactivate(candidateId) }}
        style={{
          width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 9,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12.5, fontWeight: 500, color: '#94a3b8',
          display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(148,163,184,0.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
      >
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, minWidth: 12, textAlign: 'center' }}>
          {currentStage === 'inactive' ? '▶' : '⏸'}
        </span>
        <span style={{ flex: 1 }}>{currentStage === 'inactive' ? 'Activate Candidate' : 'Inactivate Candidate'}</span>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); if (confirm('Are you sure you want to delete this candidate?')) onDelete(candidateId) }}
        style={{
          width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 9,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12.5, fontWeight: 500, color: '#ef4444',
          display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
      >
        <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, minWidth: 12, textAlign: 'center' }}>🗑</span>
        <span style={{ flex: 1 }}>Delete Candidate</span>
      </button>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CandidatesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [stageFilter, setStageFilter] = useState<string | undefined>(undefined)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [candidateToAdd, setCandidateToAdd] = useState<{ id: string; name: string } | null>(null)

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; full_name: string }) => candidatesApi.invite(data),
    onSuccess: (_, variables) => {
      toast.success(
        <div>
          <p style={{ margin: 0, fontWeight: 700 }}>Invitation Sent!</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, opacity: 0.8 }}>
            Joining invitation was sent to <strong>{variables.full_name}</strong>
          </p>
        </div>
      )
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to send invite'),
  })

  const queryParams = {
    page,
    limit: 12,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(stageFilter ? { stage: stageFilter } : {}),
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidates', queryParams],
    queryFn: () => candidatesApi.list(queryParams).then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: activeJobs } = useQuery({
    queryKey: ['jobs', 'active'],
    queryFn: () => jobsApi.list({ status: 'active', limit: 100 }).then((r: any) => r.data.items),
    refetchInterval: 30_000,
  })

  const handleAddToPipeline = async (candidateId: string, jobId: string) => {
    if (!jobId) {
      toast.error('Please select a job first')
      return
    }

    try {
      await candidatesApi.updateStage(candidateId, 'applied', false, jobId)
      toast.success('Added to pipeline successfully')
      setCandidateToAdd(null)
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      queryClient.invalidateQueries({ queryKey: ['candidates_pipeline'] })
    } catch (error) {
      toast.error('Failed to add to pipeline')
    }
  }

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      candidatesApi.updateStage(id, stage, REJECTION_STAGES.includes(stage)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      queryClient.invalidateQueries({ queryKey: ['candidates_pipeline'] })
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] })
      toast.success('Stage updated')
      setOpenDropdownId(null)
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update stage'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => candidatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] })
      queryClient.invalidateQueries({ queryKey: ['candidates_pipeline'] })
      toast.success('Candidate deleted')
      setOpenDropdownId(null)
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to delete candidate'),
  })

  const displayItems = data?.items ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(24px,3vw,32px)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            Candidates
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-light)' }}>
            {data ? `${data.total} total candidates` : 'All candidates in your organisation'}
          </p>
        </div>
        <button
          onClick={() => navigate('/recruiter/upload')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg,#6c47ff,#8b6bff)', color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(108,71,255,0.30)', transition: 'all 0.2s',
          }}
        >
          <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Candidate
        </button>
      </div>

      {/* Filters & Search Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        {/* Search Input */}
        <div style={{ width: 320 }}>
          <Input
            placeholder="Search by name, email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            leftIcon={
              <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[
            { label: 'All', value: undefined, icon: '👥' },
            { label: 'Shortlisted', value: 'shortlisted', icon: '⭐' },
            { label: 'In Review', value: 'in_review', icon: '🔍' },
            { label: 'Scheduled', value: 'scheduled', icon: '📅' },
            { label: 'Rejected', value: 'rejected', icon: '🚫' },
            { label: 'Inactive', value: 'inactive', icon: '⏸' },
          ].map((f) => {
            const isActive = statusFilter === f.value
            const statusCfg = f.value ? STATUS_CFG[f.value] : null
            return (
              <button
                key={f.label}
                onClick={() => { 
                  setStatusFilter(f.value); 
                  setPage(1); 
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 10,
                  border: isActive ? `1.5px solid ${statusCfg?.dot ?? 'rgba(108,71,255,0.35)'}` : '1.5px solid var(--table-border)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: isActive ? (statusCfg?.bg ?? 'rgba(108,71,255,0.08)') : 'var(--kpi-bg)',
                  color: isActive ? (statusCfg?.color ?? '#6c47ff') : 'var(--text-mid)',
                  transition: 'all 0.18s',
                }}
              >
                <span style={{ fontSize: 12 }}>{f.icon}</span>
                {f.label}
                {isActive && statusCfg && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusCfg.dot, display: 'inline-block', marginLeft: 2 }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 18, borderRadius: 14, background: 'var(--kpi-bg)', border: '1px solid var(--table-border)' }}>
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div style={{ borderRadius: 12, padding: 16, fontSize: 13, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.20)', color: '#ef4444' }}>
          Failed to load candidates. Please refresh.
        </div>
      ) : !displayItems.length ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          title="No candidates found"
          description={search ? 'Try adjusting your search.' : 'Upload resumes or invite candidates to get started.'}
        />
      ) : (
        <>
          {/* Column header — now hidden on mobile */}
          <div className="hidden lg:grid" style={{
            gridTemplateColumns: '1.8fr 96px 1fr 1.5fr 52px 68px 130px 115px 215px',
            gap: 14, padding: '0 24px',
            fontSize: 10, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.8px',
          }}>
            <span>Candidate</span>
            <span style={{ textAlign: 'center' }}>Date</span>
            <span>Role</span>
            <span>Skills</span>
            <span style={{ textAlign: 'center' }}>Exp</span>
            <span style={{ textAlign: 'center' }}>Score</span>
            <span style={{ textAlign: 'center' }}>Stage</span>
            <span style={{ textAlign: 'center' }}>Status</span>
            <span style={{ textAlign: 'center' }}>Actions</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 80 }}>
            {displayItems.map((candidate, i) => {
              const stage = candidate.pipeline_stage
              const stageCfg = stage ? STAGE_CFG[stage] : null
              const hasInvitation = candidate.invitations?.length > 0
              const isAccountCreated = hasInvitation && candidate.invitations[0].is_used
              const statusKey = getStatusFromStage(candidate.pipeline_stage ?? undefined)
              const statusCfg = STATUS_CFG[statusKey]

              return (
                <div
                  key={candidate.id}
                  onClick={() => setSelected(candidate)}
                  className="flex flex-col lg:grid gap-4 lg:gap-[14px] p-5 lg:px-6 lg:py-3.5"
                  style={{
                    gridTemplateColumns: '1.8fr 96px 1fr 1.5fr 52px 68px 130px 115px 215px',
                    alignItems: 'center',
                    borderRadius: 14,
                    background: 'var(--kpi-bg)',
                    border: '1px solid var(--table-border)',
                    boxShadow: 'var(--shadow)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'rgba(108,71,255,0.30)'
                    el.style.boxShadow = 'var(--shadow-h)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'var(--table-border)'
                    el.style.boxShadow = 'var(--shadow)'
                  }}
                >
                  {/* Row content for both Mobile and Desktop */}
                  <div className="flex items-center justify-between lg:contents w-full">
                    {/* Candidate */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }} className="lg:w-auto">
                      <Avatar name={candidate.full_name} src={candidate.avatar_url} size="md" />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#6c47ff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {candidate.full_name}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {candidate.email}
                        </p>
                      </div>
                    </div>

                    {/* Status (Visible on mobile top right) */}
                    <div className="lg:hidden">
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                        background: statusCfg.bg, color: statusCfg.color,
                        display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                      }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: statusCfg.dot }} />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:contents">
                    {/* Date */}
                    <p className="text-[12px] text-[var(--text-mid)] lg:text-center">
                      <span className="lg:hidden text-[10px] uppercase text-gray-400 font-bold block mb-0.5">Applied</span>
                      {formatDate(candidate.created_at)}
                    </p>

                    {/* Role */}
                    <p className="text-[13px] text-[var(--text-mid)] truncate max-w-[150px] lg:max-w-none">
                      <span className="lg:hidden text-[10px] uppercase text-gray-400 font-bold block mb-0.5">Role</span>
                      {candidate.applied_job_title || candidate.current_title || '—'}
                    </p>

                    {/* Skills */}
                    <div className="lg:flex items-center gap-1.5 flex-wrap min-w-[120px]">
                      <span className="lg:hidden text-[10px] uppercase text-gray-400 font-bold block mb-0.5 w-full">Skills</span>
                      {candidate.skills.slice(0, 2).map((skill) => (
                        <span key={skill} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(108,71,255,0.08)', color: '#6c47ff' }}>
                          {skill}
                        </span>
                      ))}
                      {candidate.skills.length > 2 && (
                        <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 600 }}>+{candidate.skills.length - 2}</span>
                      )}
                    </div>

                    {/* Exp */}
                    <p className="lg:text-center text-[12px] font-semibold text-[var(--text-mid)]">
                      <span className="lg:hidden text-[10px] uppercase text-gray-400 font-bold block mb-0.5">Experience</span>
                      {candidate.years_experience != null ? `${candidate.years_experience}y` : '—'}
                    </p>

                    {/* Score */}
                    <div className="lg:flex lg:justify-center">
                      <span className="lg:hidden text-[10px] uppercase text-gray-400 font-bold block mb-0.5">Match</span>
                      {candidate.match_score != null
                        ? <ScorePill score={candidate.match_score} />
                        : <span style={{ fontSize: 11, color: 'var(--text-light)' }}>—</span>}
                    </div>

                    {/* Stage */}
                    <div className="flex flex-col gap-1 lg:items-center">
                      <span className="lg:hidden text-[10px] uppercase text-gray-400 font-bold block mb-0.5">Pipeline Stage</span>
                      {/* Only show Reject / Talent DB for recruiter-uploaded candidates
                           who haven't set up a portal account yet */}
                      {!stageCfg && activeJobs && activeJobs.length > 0 && !isAccountCreated && (
                        candidate.match_score != null && candidate.match_score >= 70 ? (
                          <button
                            onClick={(e: any) => {
                              e.stopPropagation()
                              if (activeJobs.length === 1) {
                                handleAddToPipeline(candidate.id, activeJobs[0].id)
                              } else {
                                setCandidateToAdd({ id: candidate.id, name: candidate.full_name })
                              }
                            }}
                            className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-emerald-500 text-white shadow-sm hover:scale-105 active:scale-95 transition-all w-fit"
                          >
                            + Add in Pipeline
                          </button>
                        ) : candidate.match_score != null ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e: any) => {
                                e.stopPropagation()
                                stageMutation.mutate({ id: candidate.id, stage: 'rejected' })
                              }}
                              className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-red-500 text-white shadow-sm hover:scale-105 active:scale-95 transition-all w-fit"
                            >
                              Reject
                            </button>
                            <button
                              onClick={(e: any) => {
                                e.stopPropagation()
                                toast.success('Kept in Talent Database')
                              }}
                              className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-gray-500 text-white shadow-sm hover:scale-105 active:scale-95 transition-all w-fit"
                            >
                              Talent DB
                            </button>
                          </div>
                        ) : null
                      )}
                      {stageCfg ? (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: stageCfg.bg, color: stageCfg.color, display: 'inline-block', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {stageCfg.label}
                        </span>
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(108,71,255,0.05)', color: 'var(--text-light)', border: '1px dashed var(--table-border)' }}>
                          {candidate.match_score != null ? 'New / Needs Action' : 'Unprocessed'}
                        </span>
                      )}
                    </div>

                    {/* Desktop Status */}
                    <div className="hidden lg:flex justify-center">
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                        background: statusCfg.bg, color: statusCfg.color,
                        display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusCfg.dot }} />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center lg:justify-end gap-2 pt-3 mt-1 lg:pt-0 lg:mt-0 border-t lg:border-none border-gray-100 dark:border-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        inviteMutation.mutate({ email: candidate.email, full_name: candidate.full_name })
                      }}
                      className="flex-1 lg:flex-none text-[11px] font-bold px-3 py-2 rounded-lg bg-violet-50 text-violet-600 border border-violet-100 hover:bg-violet-100 transition-colors"
                    >
                      ✉ {hasInvitation ? 'Resend' : 'Invite'}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/recruiter/interviews?candidateId=${candidate.id}`)
                      }}
                      className="flex-1 lg:flex-none text-[11px] font-bold px-3 py-2 rounded-lg bg-[#6c47ff] text-white shadow-sm hover:bg-[#5a3ae6] transition-colors"
                    >
                      📅 Schedule
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenDropdownId(openDropdownId === candidate.id ? null : candidate.id)
                      }}
                      className="w-10 h-10 lg:w-8 lg:h-8 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      ⋯
                    </button>
                  </div>
                    <AnimatePresence>
                      {openDropdownId === candidate.id && (
                        <CandidateActionsDropdown
                          candidateId={candidate.id}
                          currentStage={stage || 'applied'}
                          onSelect={(s) => stageMutation.mutate({ id: candidate.id, stage: s })}
                          onInactivate={(id) => stageMutation.mutate({ id, stage: stage === 'inactive' ? 'applied' : 'inactive' })}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onClose={() => setOpenDropdownId(null)}
                        />
                      )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          {data && (
            <Pagination
              page={data.page}
              pages={data.pages}
              total={data.total}
              limit={data.limit}
              onPage={setPage}
            />
          )}
        </>
      )}

      {selected && <CandidateProfileModal candidate={selected} onClose={() => setSelected(null)} />}

      {candidateToAdd && (
        <Modal
          open={!!candidateToAdd}
          onClose={() => setCandidateToAdd(null)}
          title={`Add ${candidateToAdd.name} to Pipeline`}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Select Active Job
              </label>
              <div className="space-y-2">
                {activeJobs && activeJobs.length > 0 ? (
                  activeJobs.map((job: any) => (
                    <button
                      key={job.id}
                      onClick={() => handleAddToPipeline(candidateToAdd.id, job.id)}
                      className="w-full p-4 rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50 transition-all text-left flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-bold text-gray-900 group-hover:text-violet-700">{job.title}</p>
                        <p className="text-xs text-gray-500">{job.location} • {job.type}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic py-4">No active jobs found. Please create a job first.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
