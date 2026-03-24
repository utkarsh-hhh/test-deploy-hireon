import api from './axios'
import type { Interview } from '@/types'

export const interviewsApi = {
  list: () => api.get<Interview[]>('/v1/interviews'),

  create: (data: {
    candidate_id: string
    application_id?: string
    title: string
    interview_type: string
    scheduled_at: string
    duration_minutes: number
    location?: string
    notes?: string
    panelist_ids: { user_id: string; role?: string }[]
  }) => api.post<Interview>('/v1/interviews', data),

  get: (id: string) => api.get<Interview>(`/v1/interviews/${id}`),

  update: (id: string, data: Partial<Interview>) =>
    api.put<Interview>(`/v1/interviews/${id}`, data),

  cancel: (id: string, reason?: string) => 
    api.delete(`/v1/interviews/${id}`, { params: { reason } }),

  confirm: (id: string) => api.post<{ status: string; is_confirmed: boolean }>(`/v1/interviews/${id}/confirm`),
}
