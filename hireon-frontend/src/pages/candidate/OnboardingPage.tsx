import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { invitationsApi } from '@/api/invitations'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [invitation, setInvitation] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return

        invitationsApi.verify(token)
            .then(res => {
                setInvitation(res.data)
                setLoading(false)
            })
            .catch(err => {
                setError(err.response?.data?.detail || 'Invalid or expired invitation link')
                setLoading(false)
            })
    }, [token])

    const { isAuthenticated, user, logout, setTokens } = useAuthStore()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleApply = async () => {
        if (!token) return
        if (!password) return toast.error('Please set a password')
        if (password !== confirmPassword) return toast.error('Passwords do not match')
        if (password.length < 6) return toast.error('Password must be at least 6 characters')

        setIsSubmitting(true)
        try {
            const res = await invitationsApi.use(token, { password })
            toast.success('Account activated!')

            // Automatic login
            if (res.data.access_token) {
                setTokens(res.data.access_token, res.data.refresh_token, res.data.user)
                navigate('/portal')
            } else {
                navigate('/login')
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to activate account')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isAuthenticated && user?.role !== 'candidate') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <Card className="max-w-md w-full p-8 text-center border-amber-200 bg-amber-50/50">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold mb-2 text-gray-900">Logout Required</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        You are currently logged in as a <strong>{user?.role || 'user'}</strong>. To accept this invitation as a candidate, please log out first.
                    </p>
                    <div className="space-y-3">
                        <Button onClick={() => logout()} className="w-full h-12 text-md font-bold bg-violet-600 hover:bg-violet-700">
                            Logout & Continue
                        </Button>
                        <Button onClick={() => navigate(-1)} variant="outline" className="w-full h-12">
                            Go Back
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <Card className="max-w-md w-full p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold mb-2">Invitation Error</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
                    <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                        Back to Home
                    </Button>
                </Card>
            </div>
        )
    }

    const CSS = `
    .logo-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 40px; justify-content: center; }
    .logo-orbit { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; z-index: 10; }
    .logo-orbit-ring { position: absolute; inset: 0; border: 2px dashed rgba(108, 71, 255, 0.15); border-radius: 50%; animation: orbitRotate 10s linear infinite; }
    .logo-orbit-dot { position: absolute; top: -1px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #00D1FF; border-radius: 50%; box-shadow: 0 0 12px rgba(0, 209, 255, 0.6); }
    @keyframes orbitRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .logo-box { width: 36px; height: 36px; background: linear-gradient(135deg, #6C47FF 0%, #C471ED 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(108, 71, 255, 0.3); position: relative; z-index: 2; border: 1px solid rgba(255, 255, 255, 0.25); }
    .logo-wordmark { font-family: 'Inter', sans-serif; font-size: 26px; font-weight: 800; letter-spacing: -1px; color: #1A1040; position: relative; }
    .lwl { background: linear-gradient(135deg, #6C47FF 0%, #1A1040 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    `

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <style>{CSS}</style>
            <Card className="max-w-xl w-full p-10">
                <div className="text-center mb-10">
                    <div className="logo-wrap">
                        <div className="logo-orbit">
                            <div className="logo-orbit-ring">
                                <div className="logo-orbit-dot"></div>
                            </div>
                            <div className="logo-box">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <path d="M7 5V19M17 5V19M7 12H17" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                        <span className="logo-wordmark lwl">Hireon</span>
                    </div>

                    <h1 className="text-2xl font-bold mb-2">Welcome, {invitation?.full_name}!</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        You've been invited by a team member to join our candidate portal.
                        Set your account password to get started.
                    </p>
                </div>

                <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Invited Email</label>
                            <p className="text-sm font-medium">{invitation?.email}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Expires In</label>
                            <p className="text-sm font-medium text-amber-600">48 Hours</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Set Password</label>
                            <Input
                                type="password"
                                placeholder="Min. 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                            <Input
                                type="password"
                                placeholder="Repeat password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="h-11"
                            />
                        </div>
                    </div>

                    <div className="bg-violet-50 dark:bg-violet-900/10 p-4 rounded-xl border border-violet-100 dark:border-violet-900/20">
                        <h3 className="text-sm font-bold text-violet-700 dark:text-violet-300 mb-1">What's Next?</h3>
                        <p className="text-sm text-violet-600/80 dark:text-violet-400/80 leading-relaxed">
                            Once you set your password, you will be automatically logged in to complete your profile and upload your latest resume.
                        </p>
                    </div>

                    <Button
                        onClick={handleApply}
                        disabled={isSubmitting}
                        loading={isSubmitting}
                        className="w-full h-12 text-lg font-bold"
                    >
                        Create Account & Join Portal
                    </Button>

                    <p className="text-center text-[11px] text-gray-400 mt-4">
                        By clicking create account, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </Card>
        </div>
    )
}
