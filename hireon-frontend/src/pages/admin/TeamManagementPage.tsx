import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { adminApi } from '@/api/admin'
import { candidatesApi } from '@/api/candidates'
import type { User, UserRole } from '@/types'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuthStore } from '@/store/authStore'

import toast from 'react-hot-toast'

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  admin:       { bg: 'rgba(108,71,255,0.10)', color: '#6c47ff', label: 'Admin' },
  recruiter:   { bg: 'rgba(59,130,246,0.10)', color: '#2563eb', label: 'HR / Recruiter' },
  interviewer: { bg: 'rgba(251,191,36,0.10)', color: '#d97706', label: 'Interviewer' },
}

function RoleBadge({ role }: { role: string }) {
  const s = ROLE_STYLE[role] ?? { bg: 'rgba(107,114,128,0.10)', color: '#6b7280', label: role }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ─── Invite modal ─────────────────────────────────────────────────────────────
const ROLES = [
  { value: '', label: 'Select role' },
  { value: 'admin', label: 'Admin' },
  { value: 'recruiter', label: 'HR / Recruiter' },
  { value: 'interviewer', label: 'Interviewer' },
]

const inviteSchema = z.object({
  full_name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  role: z.string().min(1, 'Role required'),
  password: z.string().min(8, 'Min 8 characters'),
})
type InviteForm = z.infer<typeof inviteSchema>

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  })
  const mutation = useMutation({
    mutationFn: (data: InviteForm) => adminApi.inviteUser(data),
    onSuccess,
  })
  return (
    <Modal open onClose={onClose} title="Invite Team Member" size="sm">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input label="Full Name" placeholder="Jane Smith" error={errors.full_name?.message} {...register('full_name')} />
        <Input label="Email" type="email" placeholder="jane@company.com" error={errors.email?.message} {...register('email')} />
        <Controller name="role" control={control} render={({ field }) => (
          <Select label="Role" options={ROLES} error={errors.role?.message} {...field} />
        )} />
        <Input label="Temporary Password" type="password" placeholder="Min 8 characters" error={errors.password?.message} {...register('password')} />
        {mutation.isError && <p className="text-sm text-red-500">Failed to invite user. Email may already be registered.</p>}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending}>Send Invite</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ title, count, subtitle }: { title: string; count: number; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: "'Fraunces', serif" }}>{title}</h2>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--violet)', background: 'rgba(108,71,255,0.08)', padding: '2px 8px', borderRadius: 20 }}>
        {count}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-light)', marginLeft: 2 }}>{subtitle}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeamManagementPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [showInvite, setShowInvite] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)
  // Team members (admin + recruiter + interviewer)

  // Team members (admin + recruiter + interviewer)
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
  })

  // Hired candidates (joined the company)
  const { data: hiredData, isLoading: hiredLoading } = useQuery({
    queryKey: ['candidates', 'hired-members'],
    queryFn: () => candidatesApi.list({ stage: 'hired_joined', limit: 50 }).then((r) => r.data),
  })

  // Also fetch 'hired' stage (offered & accepted but not yet tagged hired_joined)
  const { data: hiredData2 } = useQuery({
    queryKey: ['candidates', 'hired-members-2'],
    queryFn: () => candidatesApi.list({ stage: 'hired', limit: 50 }).then((r) => r.data),
  })

  const teamMembers = (users ?? []).filter(u => u.role !== 'candidate')
  const joinedCandidates = [
    ...(hiredData?.items ?? []),
    ...(hiredData2?.items ?? []),
  ]

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateUser(id, { is_active }),
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(is_active ? 'User activated' : 'User deactivated')
      setToggleTarget(null)
    },
    onError: () => toast.error('Failed to update user status'),
  })

  const isLoading = usersLoading || hiredLoading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            Team & Members
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-light)' }}>
            Your internal team + candidates who have joined the company
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="btn-primary-gradient"
          style={{ padding: '10px 20px', borderRadius: 12 }}
        >
          + Invite Member
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderRadius: 14, background: 'var(--kpi-bg)', border: '1px solid var(--table-border)' }}>
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── Section 1: Internal Team ── */}
          <div>
            <SectionHeading
              title="Internal Team"
              count={teamMembers.length}
              subtitle="Admins, HR Recruiters & Interviewers"
            />
            {teamMembers.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--text-light)' }}>No team members yet. Invite someone to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {teamMembers.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 20px', borderRadius: 14,
                      background: 'var(--kpi-bg)', border: '1px solid var(--table-border)',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,71,255,0.25)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--table-border)' }}
                  >
                    {/* Avatar with online dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar name={member.full_name} src={member.avatar_url} size="md" />
                      <span style={{
                        position: 'absolute', bottom: -1, right: -1,
                        width: 11, height: 11, borderRadius: '50%',
                        background: member.is_active ? '#10b981' : '#9ca3af',
                        border: '2px solid var(--kpi-bg)',
                      }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{member.full_name}</p>
                        {currentUser?.id === member.id && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--violet)', background: 'rgba(108,71,255,0.08)', padding: '1px 6px', borderRadius: 20 }}>you</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 1 }}>{member.email}</p>
                    </div>

                    {/* Role + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RoleBadge role={member.role} />
                      {!member.is_active && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Toggle action */}
                    {currentUser?.id !== member.id && (
                      <button
                        onClick={() => setToggleTarget(member)}
                        style={{
                          padding: '5px 12px', borderRadius: 8, border: '1px solid',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: 'transparent',
                          color: member.is_active ? '#ef4444' : '#059669',
                          borderColor: member.is_active ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)',
                        }}
                      >
                        {member.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 2: Hired / Joined Candidates ── */}
          <div>
            <SectionHeading
              title="Joined the Company"
              count={joinedCandidates.length}
              subtitle="Candidates hired & onboarded"
            />
            {joinedCandidates.length === 0 ? (
              <div style={{
                padding: '40px 20px', textAlign: 'center', borderRadius: 14,
                background: 'var(--kpi-bg)', border: '1px dashed var(--table-border)',
              }}>
                <span style={{ fontSize: 32 }}>🎉</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 10 }}>No hires yet</p>
                <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>
                  Candidates moved to "Hired" or "Hired & Joined" stage will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {joinedCandidates.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      padding: '16px 18px', borderRadius: 14,
                      background: 'var(--kpi-bg)', border: '1px solid var(--table-border)',
                      display: 'flex', gap: 12, alignItems: 'center',
                    }}
                  >
                    <Avatar name={c.full_name} src={c.avatar_url} size="md" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.full_name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.current_title || c.email}
                      </p>
                      {c.skills?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                          {c.skills.slice(0, 3).map(s => (
                            <span key={s} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: 'rgba(108,71,255,0.08)', color: 'var(--violet)' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.10)', color: '#059669', flexShrink: 0 }}>
                      Joined
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setShowInvite(false)
            toast.success('Invitation sent successfully!')
          }}
        />
      )}

      {/* Toggle Confirm */}
      <ConfirmModal
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => toggleTarget && toggleActiveMutation.mutate({ id: toggleTarget.id, is_active: !toggleTarget.is_active })}
        title={toggleTarget?.is_active ? 'Deactivate User' : 'Activate User'}
        message={
          toggleTarget?.is_active
            ? `Deactivate ${toggleTarget?.full_name}? They will no longer be able to log in.`
            : `Reactivate ${toggleTarget?.full_name}? They will regain access to the platform.`
        }
        confirmText={toggleTarget?.is_active ? 'Deactivate' : 'Activate'}
        danger={toggleTarget?.is_active}
        loading={toggleActiveMutation.isPending}
      />

    </div>
  )
}
