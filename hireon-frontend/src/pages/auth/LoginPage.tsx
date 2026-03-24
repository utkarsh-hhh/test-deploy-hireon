import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()
  const [serverError, setServerError] = useState('')
  const [activeTab, setActiveTab] = useState<'pass' | 'magic'>('pass')
  const [showPassword, setShowPassword] = useState(false)
  const [view, setView] = useState<'login' | 'forgot' | 'forgot_sent' | 'magic_sent'>('login')
  const [fpEmail, setFpEmail] = useState('')
  const [fpLoading, setFpLoading] = useState(false)
  const [fpError, setFpError] = useState('')

  const [magicEmail, setMagicEmail] = useState('')
  const [magicLoading, setMagicLoading] = useState(false)
  const [magicError, setMagicError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormData) => {
    setServerError('')
    try {
      const { data } = await authApi.login(values.email, values.password)
      setTokens(data.access_token, undefined, data.user)
      if (data.user.role === 'candidate') navigate('/portal')
      else if (data.user.role === 'interviewer') navigate('/interviewer')
      else navigate('/recruiter')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Invalid email or password. Please try again.'
      setServerError(msg)
    }
  }

  const onForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFpError('')
    if (!fpEmail || !/\S+@\S+\.\S+/.test(fpEmail)) {
      setFpError('Enter a valid email address')
      return
    }
    setFpLoading(true)
    try {
      await authApi.forgotPassword(fpEmail)
      setView('forgot_sent')
    } catch {
      setFpError('Something went wrong. Please try again.')
    } finally {
      setFpLoading(false)
    }
  }

  const onMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMagicError('')
    if (!magicEmail || !/\S+@\S+\.\S+/.test(magicEmail)) {
      setMagicError('Enter a valid email address')
      return
    }
    setMagicLoading(true)
    try {
      await authApi.sendCandidateMagicLink(magicEmail)
      setView('magic_sent')
    } catch (err: any) {
      setMagicError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setMagicLoading(false)
    }
  }

  const CSS = `
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      font-family: 'Sora', sans-serif;
      background: #fff;
    }
    .aurora { position: fixed; inset: 0; background: linear-gradient(135deg, #f0eeff 0%, #ffe8f8 35%, #e8f0ff 65%, #f0fff8 100%); z-index: 0; }
    .aura { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
    .a1 { width: 700px; height: 700px; background: radial-gradient(circle, rgba(108,71,255,.28), transparent 70%); top: -250px; right: -150px; animation: drift1 16s ease-in-out infinite alternate; }
    .a2 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(255,107,198,.22), transparent 70%); bottom: -200px; left: -150px; animation: drift2 20s ease-in-out infinite alternate; }
    .a3 { width: 350px; height: 350px; background: radial-gradient(circle, rgba(0,212,200,.18), transparent 70%); top: 40%; left: 35%; animation: drift3 12s ease-in-out infinite alternate; }
    .a4 { width: 250px; height: 250px; background: radial-gradient(circle, rgba(251,191,36,.14), transparent 70%); bottom: 20%; right: 25%; animation: drift1 9s ease-in-out infinite alternate; }
    @keyframes drift1 { to { transform: translate(40px, -50px); } }
    @keyframes drift2 { to { transform: translate(-30px, 40px); } }
    @keyframes drift3 { to { transform: translate(50px, -30px); } }
    .float-card { position: absolute; background: rgba(255,255,255,.55); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,.8); border-radius: 16px; padding: 14px 18px; box-shadow: 0 8px 32px rgba(108,71,255,.12); font-size: 12px; font-weight: 600; color: #5a4e7a; display: flex; align-items: center; gap: 9px; animation: floatAnim 6s ease-in-out infinite alternate; z-index: 1; }
    .fc1 { top: 12%; left: 6%; animation-delay: 0s; }
    .fc2 { top: 18%; right: 8%; animation-delay: 1.5s; }
    .fc3 { bottom: 18%; left: 7%; animation-delay: 2.5s; }
    .fc4 { bottom: 12%; right: 6%; animation-delay: 0.8s; }
    @keyframes floatAnim { from { transform: translateY(0); } to { transform: translateY(-12px); } }
    .fc-dot { width: 8px; height: 8px; border-radius: 50%; }
    .glass-card { position: relative; z-index: 2; width: 440px; background: rgba(255,255,255,.65); border: 1px solid rgba(255,255,255,.9); border-radius: 28px; padding: 46px 42px; backdrop-filter: blur(40px); box-shadow: 0 24px 80px rgba(108,71,255,.16), 0 2px 0 rgba(255,255,255,.9) inset; animation: cardIn .7s cubic-bezier(.16,1,.3,1) both; }
    @keyframes cardIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    .logo-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; justify-content: center; }
    .logo-mark { width: 40px; height: 40px; background: linear-gradient(135deg, #6c47ff, #ff6bc6); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(108,71,255,.35); }
    .logo-text { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -.5px; background: linear-gradient(135deg, #6c47ff, #ff6bc6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .form-h1 { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px; font-weight: 800; color: #1a1040; text-align: center; margin-bottom: 5px; letter-spacing: -.4px; }
    .form-h2 { font-size: 13px; color: #9689bb; text-align: center; margin-bottom: 30px; }
    .tabs-list { display: flex; background: rgba(108,71,255,.07); border-radius: 12px; padding: 4px; margin-bottom: 24px; }
    .tab-btn { flex: 1; padding: 9px; text-align: center; font-size: 13px; font-weight: 600; color: #9689bb; border-radius: 9px; cursor: pointer; transition: all .22s; border: none; background: transparent; }
    .tab-btn.active { background: #fff; color: #6c47ff; box-shadow: 0 2px 8px rgba(108,71,255,.15); }
    .field-box { margin-bottom: 14px; position: relative; }
    .field-label { display: block; font-size: 11px; font-weight: 700; color: #5a4e7a; letter-spacing: .7px; text-transform: uppercase; margin-bottom: 7px; text-align: left; }
    .input-ctrl { width: 100%; padding: 12px 16px; background: rgba(255,255,255,.8); border: 1.5px solid rgba(108,71,255,.14); border-radius: 12px; color: #1a1040; font-family: 'Sora', sans-serif; font-size: 13px; outline: none; transition: all .2s; backdrop-filter: blur(8px); box-sizing: border-box; }
    .input-ctrl:focus { border-color: #6c47ff; background: rgba(255,255,255,.95); box-shadow: 0 0 0 3px rgba(108,71,255,.1); }
    .input-ctrl::placeholder { color: #c4b9de; }
    .input-ctrl.with-toggle { padding-right: 44px; }
    .input-wrap { position: relative; }
    .eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9689bb; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color .2s; }
    .eye-btn:hover { color: #6c47ff; }
    .error-txt { margin-top: 4px; font-size: 11px; color: #ef4444; text-align: left; }
    .row-utils { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; font-size: 12px; }
    .remember-chk { display: flex; align-items: center; gap: 7px; color: #9689bb; cursor: pointer; }
    .forgot-link { color: #6c47ff; font-weight: 600; text-decoration: none; background: none; border: none; cursor: pointer; font-family: 'Sora', sans-serif; font-size: 12px; padding: 0; }
    .forgot-link:hover { text-decoration: underline; }
    .btn-submit { width: 100%; padding: 13px; border-radius: 13px; background: linear-gradient(135deg, #6c47ff, #9b6bff); color: #fff; font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: all .25s; box-shadow: 0 8px 24px rgba(108,71,255,.38), 0 1px 0 rgba(255,255,255,.2) inset; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(108,71,255,.5); }
    .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
    .btn-back { background: none; border: none; cursor: pointer; color: #9689bb; font-size: 12px; font-weight: 600; font-family: 'Sora', sans-serif; display: flex; align-items: center; gap: 5px; padding: 0; margin-bottom: 20px; transition: color .2s; }
    .btn-back:hover { color: #6c47ff; }
    .or-divider { display: flex; align-items: center; gap: 12px; margin: 18px 0; font-size: 11px; color: #c4b9de; font-weight: 600; }
    .or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: rgba(108,71,255,.1); }
    .socials-grid { display: flex; gap: 10px; }
    .social-btn { flex: 1; padding: 11px; border-radius: 12px; border: 1.5px solid rgba(108,71,255,.15); background: rgba(255,255,255,.7); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 12px; font-weight: 600; color: #5a4e7a; transition: all .2s; backdrop-filter: blur(8px); }
    .social-btn:hover { border-color: rgba(108,71,255,.4); background: rgba(255,255,255,.9); transform: translateY(-1px); }
    .foot-note { text-align: center; margin-top: 20px; font-size: 12px; color: #9689bb; }
    .foot-note a { color: #6c47ff; font-weight: 700; text-decoration: none; }
    .server-err { margin-bottom: 20px; padding: 12px; border-radius: 12px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; font-size: 13px; text-align: left; }
    .sent-icon { width: 64px; height: 64px; border-radius: 20px; background: linear-gradient(135deg, rgba(108,71,255,.12), rgba(108,71,255,.06)); border: 1px solid rgba(108,71,255,.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    @media (max-width: 640px) { .glass-card { width: 90%; padding: 32px 24px; } .float-card { display: none; } }
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `

  return (
    <div className="login-container">
      <style>{CSS}</style>

      <div className="aurora">
        <div className="aura a1" />
        <div className="aura a2" />
        <div className="aura a3" />
        <div className="aura a4" />
      </div>

      <div className="float-card fc1"><div className="fc-dot" style={{ background: '#10b981' }} /> 24 shortlisted today</div>
      <div className="float-card fc2"><div className="fc-dot" style={{ background: '#6c47ff' }} /> AI scoring live</div>
      <div className="float-card fc3"><div className="fc-dot" style={{ background: '#ff6bc6' }} /> 3 interviews scheduled</div>
      <div className="float-card fc4"><div className="fc-dot" style={{ background: '#00d4c8' }} /> 97% match accuracy</div>

      <div className="glass-card">
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

        {view === 'forgot_sent' || view === 'magic_sent' ? (
          <div style={{ textAlign: 'center' }}>
            <div className="sent-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6c47ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h1 className="form-h1" style={{ marginBottom: 10 }}>Check your inbox</h1>
            <p className="form-h2" style={{ marginBottom: 32 }}>
              We sent a {view === 'magic_sent' ? 'magic' : 'reset'} link to <strong style={{ color: '#1a1040' }}>{view === 'magic_sent' ? magicEmail : fpEmail}</strong>.<br />Link expires in {view === 'magic_sent' ? '48 hours' : '30 minutes'}.
            </p>
            <button className="btn-submit" type="button" onClick={() => { setView('login'); setFpEmail(''); setMagicEmail(''); }}>
              Back to Sign In
            </button>
            <p style={{ marginTop: 16, fontSize: 12, color: '#9689bb' }}>
              Didn't get it?{' '}
              <button className="forgot-link" onClick={() => { setView(view === 'magic_sent' ? 'login' : 'forgot'); if (view === 'magic_sent') setActiveTab('magic'); setFpError(''); setMagicError(''); }}>Try again</button>
            </p>
          </div>
        ) : view === 'forgot' ? (
          <div>
            <button className="btn-back" onClick={() => { setView('login'); setFpError('') }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Back to Sign In
            </button>
            <h1 className="form-h1">Forgot password?</h1>
            <p className="form-h2" style={{ marginBottom: 28 }}>Enter your email and we'll send a reset link.</p>
            {fpError && <div className="server-err">{fpError}</div>}
            <form onSubmit={onForgotSubmit}>
              <div className="field-box">
                <label className="field-label">Email</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="input-ctrl"
                  value={fpEmail}
                  onChange={e => setFpEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ height: 8 }} />
              <button className="btn-submit" type="submit" disabled={fpLoading}>
                {fpLoading ? (
                  <>
                    <svg className="animate-spin" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending...
                  </>
                ) : 'Send Reset Link →'}
              </button>
            </form>
          </div>
        ) : (
          <>
            <h1 className="form-h1">Good to see you</h1>
            <p className="form-h2">Sign in to your hiring dashboard</p>

            <div className="tabs-list">
              <button className={`tab-btn ${activeTab === 'pass' ? 'active' : ''}`} onClick={() => setActiveTab('pass')}>Login</button>
              <button className={`tab-btn ${activeTab === 'magic' ? 'active' : ''}`} onClick={() => setActiveTab('magic')}>Magic Link</button>
            </div>

            {serverError && <div className="server-err">{serverError}</div>}
            {magicError && <div className="server-err">{magicError}</div>}

            {activeTab === 'pass' ? (
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="field-box">
                  <label className="field-label">Email</label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    className="input-ctrl"
                    {...register('email')}
                    style={{ border: errors.email ? '1.5px solid #ef4444' : '' }}
                  />
                  {errors.email && <div className="error-txt">{errors.email.message}</div>}
                </div>
                <div className="field-box">
                  <label className="field-label">Password</label>
                  <div className="input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      className="input-ctrl with-toggle"
                      {...register('password')}
                      style={{ border: errors.password ? '1.5px solid #ef4444' : '' }}
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                      {showPassword ? (
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
                  {errors.password && <div className="error-txt">{errors.password.message}</div>}
                </div>
                <div className="row-utils">
                  <label className="remember-chk">
                    <input type="checkbox" style={{ accentColor: '#6c47ff' }} /> Remember me
                  </label>
                  <button type="button" className="forgot-link" onClick={() => { setView('forgot'); setServerError(''); setFpError('') }}>
                    Forgot password?
                  </button>
                </div>
                <button className="btn-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Signing In...
                    </>
                  ) : <>Sign In &rarr;</>}
                </button>
              </form>
            ) : (
              <form onSubmit={onMagicSubmit}>
                <div className="field-box">
                  <label className="field-label">Email</label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    className="input-ctrl"
                    value={magicEmail}
                    onChange={e => setMagicEmail(e.target.value)}
                  />
                </div>
                <div style={{ height: '64px' }} />
                <button className="btn-submit" type="submit" disabled={magicLoading}>
                  {magicLoading ? (
                    <>
                      <svg className="animate-spin" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Sending...
                    </>
                  ) : 'Send Magic Link ✨'}
                </button>
              </form>
            )}

            <div className="or-divider">or continue with</div>
            <div className="socials-grid">
              <button className="social-btn" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </button>
              <button className="social-btn" type="button">
                <svg width="16" height="16" viewBox="0 0 24 24"><rect x="1" y="1" width="10.5" height="10.5" fill="#F25022"/><rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00"/><rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF"/><rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900"/></svg>
                Microsoft
              </button>
            </div>
            <div className="foot-note">No account? <Link to="/register">create one &rarr;</Link></div>
          </>
        )}
      </div>
    </div>
  )
}
