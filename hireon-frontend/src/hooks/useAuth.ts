import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'

export function useAuth() {
  const { user, isAuthenticated, setTokens, logout: storeLogout } = useAuthStore()
  const navigate = useNavigate()

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password)
    setTokens(data.access_token, undefined, data.user)
    // Role-based redirect
    if (data.user.role === 'candidate') navigate('/portal')
    else if (data.user.role === 'interviewer') navigate('/interviewer')
    else navigate('/recruiter')
  }

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('hireon_refresh_token') ?? undefined
      await authApi.logout(refreshToken)
    } catch (_) {
      // ignore errors
    }
    storeLogout()
    navigate('/login')
  }

  return { user, isAuthenticated, login, logout }
}
