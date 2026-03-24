import api from './axios'
import type { AuthResponse, User } from '@/types'

export const authApi = {
  register: (data: {
    full_name: string
    email: string
    password: string
    organization_name: string
    organization_slug: string
  }) => api.post<AuthResponse>('/v1/auth/register', data),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/v1/auth/login', { email, password }),

  logout: (refresh_token?: string) =>
    api.post('/v1/auth/logout', refresh_token ? { refresh_token } : {}),

  me: () => api.get<User>('/v1/auth/me'),

  changePassword: (current_password: string, new_password: string) =>
    api.put('/v1/auth/me/password', { current_password, new_password }),

  connectCalendar: () => api.get<{ auth_url: string }>('/v1/calendar/auth'),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/v1/auth/forgot-password', { email }),

  resetPassword: (token: string, new_password: string) =>
    api.post<{ message: string }>('/v1/auth/reset-password', { token, new_password }),

  sendCandidateMagicLink: (email: string) =>
    api.post<{ message: string }>('/v1/auth/candidate/magic-link', { email }),
}
