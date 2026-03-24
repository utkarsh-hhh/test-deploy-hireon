import api from './axios'
import type { User, PaginatedResponse, AuditLog } from '@/types'

export const adminApi = {
  listUsers: () => api.get<User[]>('/v1/users'),

  inviteUser: (data: { email: string; full_name: string; role: string; password: string }) =>
    api.post<User>('/v1/users/invite', data),

  updateUser: (id: string, data: Partial<User>) => api.put<User>(`/v1/users/${id}`, data),

  auditLogs: (params?: { page?: number; limit?: number; action?: string; resource_type?: string }) =>
    api.get<PaginatedResponse<AuditLog>>('/v1/admin/audit-logs', { params }),

  stats: () => api.get('/v1/admin/stats'),
}
