import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (!token) { setError('Invalid or missing reset token.'); return }
    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Reset link is invalid or has expired.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const CSS = `
    .rp-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; font-family: 'Sora', sans-serif; }
    .aurora { position: fixed; inset: 0; background: linear-gradient(135deg, #f0eeff 0%, #ffe8f8 35%, #e8f0ff 65%, #f0fff8 100%); z-index: 0; }
    .aura { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
    .a1 { width: 700px; height: 700px; background: radial-gradient(circle, rgba(108,71,255,.28), transparent 70%); top: -250px; right: -150px; animation: drift1 16s ease-in-out infinite alternate; }
    .a2 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(255,107,198,.22), transparent 70%); bottom: -200px; left: -150px; animation: drift2 20s ease-in-out infinite alternate; }
    @keyframes drift1 { to { transform: translate(40px,-50px); } }
    @keyframes drift2 { to { transform: translate(-30px,40px); } }
    .rp-card { position: relative; z-index: 2; width: 420px; background: rgba(255,255,255,.65); border: 1px solid rgba(255,255,255,.9); border-radius: 28px; padding: 46px 42px; backdrop-filter: blur(40px); box-shadow: 0 24px 80px rgba(108,71,255,.16); animation: cardIn .7s cubic-bezier(.16,1,.3,1) both; }
    @keyframes cardIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    .logo-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; justify-content: center; }
    .logo-mark { width: 40px; height: 40px; background: linear-gradient(135deg, #6c47ff, #ff6bc6); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(108,71,255,.35); }
    .logo-text { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -.5px; background: linear-gradient(135deg, #6c47ff, #ff6bc6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .rp-h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px; font-weight: 800; color: #1a1040; text-align: center; margin-bottom: 5px; letter-spacing: -.4px; }
    .rp-sub { font-size: 13px; color: #9689bb; text-align: center; margin-bottom: 28px; }
    .field-box { margin-bottom: 14px; }
    .field-label { display: block; font-size: 11px; font-weight: 700; color: #5a4e7a; letter-spacing: .7px; text-transform: uppercase; margin-bottom: 7px; }
    .input-wrap { position: relative; }
    .input-ctrl { width: 100%; padding: 12px 16px; background: rgba(255,255,255,.8); border: 1.5px solid rgba(108,71,255,.14); border-radius: 12px; color: #1a1040; font-family: 'Sora', sans-serif; font-size: 13px; outline: none; transition: all .2s; box-sizing: border-box; }
    .input-ctrl:focus { border-color: #6c47ff; background: rgba(255,255,255,.95); box-shadow: 0 0 0 3px rgba(108,71,255,.1); }
    .input-ctrl::placeholder { color: #c4b9de; }
    .input-ctrl.with-toggle { padding-right: 44px; }
    .eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9689bb; padding: 4px; display: flex; align-items: center; transition: color .2s; }
    .eye-btn:hover { color: #6c47ff; }
    .error-txt { margin-top: 4px; font-size: 11px; color: #ef4444; }
    .server-err { margin-bottom: 18px; padding: 12px; border-radius: 12px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; font-size: 13px; }
    .btn-submit { width: 100%; padding: 13px; border-radius: 13px; background: linear-gradient(135deg, #6c47ff, #9b6bff); color: #fff; font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: all .25s; box-shadow: 0 8px 24px rgba(108,71,255,.38); display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; }
    .btn-submit:hover { transform: translateY(-2px); }
    .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
    .strength-bar { height: 3px; border-radius: 3px; background: #f0eeff; margin-top: 6px; overflow: hidden; }
    .strength-fill { height: 100%; border-radius: 3px; transition: width .3s, background .3s; }
    .success-icon { width: 64px; height: 64px; border-radius: 20px; background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @media (max-width: 640px) { .rp-card { width: 90%; padding: 32px 24px; } }
  `

  const pwStrength = (pw: string) => {
    if (!pw) return { pct: 0, color: '#e5e7eb', label: '' }
    if (pw.length < 6) return { pct: 25, color: '#ef4444', label: 'Weak' }
    if (pw.length < 8) return { pct: 50, color: '#f59e0b', label: 'Fair' }
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { pct: 100, color: '#10b981', label: 'Strong' }
    return { pct: 75, color: '#6c47ff', label: 'Good' }
  }
  const strength = pwStrength(password)

  return (
    <div className="rp-container">
      <style>{CSS}</style>
      <div className="aurora">
        <div className="aura a1" />
        <div className="aura a2" />
      </div>

      <div className="rp-card">
        <div className="logo-wrap">
          <div className="logo-orbit">
            <div className="logo-orbit-ring"></div>
            <div className="logo-box">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="3" width="4" height="16" rx="2" fill="white" opacity="0.95"/>
                <rect x="16" y="3" width="4" height="16" rx="2" fill="white" opacity="0.95"/>
                <rect x="2" y="9" width="18" height="4" rx="2" fill="white" opacity="0.95"/>
              </svg>
            </div>
          </div>
          <span className="logo-wordmark lwl" style={{ fontSize: '22px' }}>Hireon</span>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div className="success-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 className="rp-h1" style={{ marginBottom: 10 }}>Password reset!</h1>
            <p className="rp-sub" style={{ marginBottom: 32 }}>Your password has been updated successfully. You can now sign in.</p>
            <button className="btn-submit" onClick={() => navigate('/login')}>Go to Sign In →</button>
          </div>
        ) : (
          <>
            <h1 className="rp-h1">Set new password</h1>
            <p className="rp-sub">Must be at least 8 characters.</p>
            {error && <div className="server-err">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field-box">
                <label className="field-label">New Password</label>
                <div className="input-wrap">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••••"
                    className="input-ctrl with-toggle"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
                    {showPw ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {password && (
                  <>
                    <div className="strength-bar">
                      <div className="strength-fill" style={{ width: `${strength.pct}%`, background: strength.color }} />
                    </div>
                    <div style={{ fontSize: 10, color: strength.color, fontWeight: 700, marginTop: 3 }}>{strength.label}</div>
                  </>
                )}
              </div>
              <div className="field-box">
                <label className="field-label">Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••••"
                  className="input-ctrl"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={{ border: confirm && confirm !== password ? '1.5px solid #ef4444' : '' }}
                />
                {confirm && confirm !== password && <div className="error-txt">Passwords do not match</div>}
              </div>
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <svg className="animate-spin" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Resetting...
                  </>
                ) : 'Reset Password →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
