import api from './axios'
import type { Application, PaginatedResponse, ApplicationStage } from '@/types'

export const applicationsApi = {
  list: (params?: { page?: number; limit?: number; job_id?: string; stage?: string }) =>
    api.get<PaginatedResponse<Application>>('/v1/applications', { params }),

  create: (data: { job_id: string; candidate_id: string; source?: string }) =>
    api.post<Application>('/v1/applications', data),

  get: (id: string) => api.get<Application>(`/v1/applications/${id}`),

  updateStage: (id: string, stage: ApplicationStage, rejection_reason?: string) =>
    api.patch<Application>(`/v1/applications/${id}/stage`, { stage, rejection_reason }),

  updateNotes: (id: string, notes: string) =>
    api.patch(`/v1/applications/${id}/notes`, { recruiter_notes: notes }),
}
