import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portalApi } from '@/api/portal'
import { formatSalary } from '@/utils/formatters'

function completionPercent(data: any): number {
  const fields = [
    !!data.full_name,
    !!data.phone,
    !!data.location,
    !!data.linkedin_url,
    !!data.github_url,
    !!data.summary,
    data.skills?.length > 0,
    !!data.resume_url,
    !!data.experience_years,
    !!data.current_ctc,
    !!data.availability_status
  ]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
}

function FieldRow({ label, value, placeholder, type = 'text' }: { label: string; value: string; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="flabel">{label}</label>
      <input
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        readOnly
        className="finput"
      />
    </div>
  )
}

export default function PortalProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['portal', 'profile'],
    queryFn: () => portalApi.profile().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => portalApi.uploadResume(file),
    onSuccess: () => {
      setUploadError(null)
      queryClient.invalidateQueries({ queryKey: ['portal', 'profile'] })
    },
    onError: (err: any) => {
      setUploadError(err?.response?.data?.detail || 'Upload failed. Please try again.')
    },
  })

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowed.includes(file.type)) {
      setUploadError('Only PDF, DOC, or DOCX files are supported.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 5 MB.')
      return
    }
    setUploadError(null)
    uploadMutation.mutate(file)
  }

  if (isLoading) {
    return <div className="p-8 text-center text-[var(--text-lite)]">Loading profile...</div>
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'C'

  const pct = profile ? completionPercent(profile) : 0
  const isComplete = pct >= 80

  return (
    <div className="page active" id="page-profile">
      <div className="ph">
        <div className="pt">My Profile &amp; Resume 👤</div>
        <div className="ps">Keep your profile up to date to help interviewers understand you better.</div>
      </div>

      <div className="g2" style={{ marginBottom: 20 }}>

        {/* PROFILE CARD */}
        <div className="card">
          <div className="ctitle">Profile</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
            <div className="prof-av-big">{initials}</div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--text)' }}>
                {profile?.full_name || 'Candidate'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 3 }}>
                {profile?.current_title || 'Position'}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                <span className={`chip ${isComplete ? 'chip-green' : 'chip-amber'}`}>
                  <span className="chd"></span>{isComplete ? 'Profile Complete' : 'Incomplete'} ({pct}%)
                </span>
                <span className="chip chip-violet"><span className="chd"></span>Active</span>
              </div>
            </div>
          </div>

          <div className="frow" style={{ marginBottom: 12 }}>
            <FieldRow label="First Name" value={profile?.full_name?.split(' ')[0] || ''} placeholder="First" />
            <FieldRow label="Last Name" value={profile?.full_name?.split(' ').slice(1).join(' ') || ''} placeholder="Last" />
          </div>

          <div style={{ marginBottom: 12 }}>
            <FieldRow label="Email" value={profile?.email || ''} placeholder="Email address" type="email" />
          </div>

          <div className="frow" style={{ marginBottom: 12 }}>
            <FieldRow label="Phone" value={profile?.phone || ''} placeholder="+1 555-0000" type="tel" />
            <FieldRow label="Location" value={profile?.location || ''} placeholder="City, Country" />
          </div>

          <div className="frow" style={{ marginBottom: 12 }}>
            <FieldRow label="Experience" value={profile?.experience_years != null ? `${profile.experience_years} Years` : ''} placeholder="e.g. 5 Years" />
            <FieldRow label="Notice Period" value={profile?.notice_period_days != null ? `${profile.notice_period_days} Days` : ''} placeholder="e.g. 30 Days" />
          </div>

          <div className="frow" style={{ marginBottom: 12 }}>
            <FieldRow label="Current CTC" value={profile?.current_ctc ? formatSalary(profile.current_ctc, null, 'INR') : ''} placeholder="e.g. ₹22,00,000" />
            <FieldRow label="Expected CTC" value={profile?.expected_ctc ? formatSalary(profile.expected_ctc, null, 'INR') : ''} placeholder="e.g. ₹32,00,000" />
          </div>

          <div className="frow" style={{ marginBottom: 12 }}>
            <div>
              <label className="flabel">Work Mode Preference</label>
              <select className="finput" defaultValue={profile?.work_mode_preference || ''} disabled>
                <option value="">Select Mode</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>
            <div>
              <label className="flabel">Availability</label>
              <select className="finput" defaultValue={profile?.availability_status || ''} disabled>
                <option value="">Select Status</option>
                <option value="immediate">Immediate</option>
                <option value="serving_notice">Serving Notice</option>
                <option value="not_looking">Not Looking</option>
              </select>
            </div>
          </div>

          {/* INTERVIEW AVAILABILITY */}
          <div style={{ borderTop: '1px solid var(--table-border)', paddingTop: 14, marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mid)', marginBottom: 10, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '.5px' }}>
              📅 INTERVIEW AVAILABILITY
            </div>
            <div className="frow" style={{ marginBottom: 10 }}>
              <div>
                <label className="flabel">Preferred Interview Days</label>
                <input className="finput" readOnly value={profile?.interview_availability_days?.join(', ') || 'Not specified'} />
              </div>
              <div>
                <label className="flabel">Preferred Time Slot</label>
                <input className="finput" readOnly value={profile?.interview_time_slot || 'Not specified'} />
              </div>
            </div>
          </div>
        </div>

        {/* SIDE COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Bio Box */}
          <div className="card">
            <div className="ctitle">Bio &amp; Summary</div>
            <textarea
              className="ftarea"
              readOnly
              defaultValue={profile?.summary || ''}
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Links Box */}
          <div className="card">
            <div className="ctitle">Links &amp; Social</div>
            <div style={{ marginBottom: 12 }}>
              <FieldRow label="LinkedIn" value={profile?.linkedin_url || ''} placeholder="linkedin.com/in/" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <FieldRow label="GitHub" value={profile?.github_url || ''} placeholder="github.com/" />
            </div>
            <div>
              <FieldRow label="Portfolio" value={profile?.portfolio_url || ''} placeholder="https://" />
            </div>
          </div>

          {/* Resume & Skills Box */}
          <div className="card">
            <div className="ctitle">Resume <span className="ctag violet">Required</span></div>

            {profile?.resume_url && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>📄</span>
                <a href={profile.resume_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', textDecoration: 'none' }}>
                  {profile.resume_filename || 'View Current Resume'}
                </a>
              </div>
            )}

            {uploadError && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', marginBottom: 12, fontSize: 13, color: '#ef4444' }}>
                ⚠️ {uploadError}
              </div>
            )}

            <div
              className="upload-zone"
              onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                handleFile(e.dataTransfer.files[0])
              }}
              style={{
                ...(dragOver ? { borderColor: 'var(--brand)', background: 'rgba(124,58,237,.07)' } : {}),
                cursor: uploadMutation.isPending ? 'not-allowed' : 'pointer',
                opacity: uploadMutation.isPending ? 0.7 : 1,
              }}
            >
              <div className="upload-zone-ico">
                {uploadMutation.isPending ? '⏳' : '📎'}
              </div>
              <div className="upload-zone-title">
                {uploadMutation.isPending ? 'Uploading & parsing resume...' : 'Drop your resume here'}
              </div>
              <div className="upload-zone-sub">
                {uploadMutation.isPending ? 'This may take a moment' : 'PDF, DOC, DOCX — max 5 MB'}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            <div className="ctitle" style={{ marginTop: 20 }}>Skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile?.skills?.map((skill: string) => (
                <span key={skill} className="skill-tag">{skill}</span>
              ))}
              <span className="skill-tag add" title="Recruiter managed">+ Add</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
