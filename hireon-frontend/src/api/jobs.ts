import api from './axios'
import type { Job, PaginatedResponse } from '@/types'

export const jobsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get<PaginatedResponse<Job>>('/v1/jobs', { params }),

  create: (data: Partial<Job>) => api.post<Job>('/v1/jobs', data),

  get: (id: string) => api.get<Job>(`/v1/jobs/${id}`),

  update: (id: string, data: Partial<Job>) => api.put<Job>(`/v1/jobs/${id}`, data),

  delete: (id: string) => api.delete(`/v1/jobs/${id}`),

  parseJD: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<any>('/v1/jobs/parse-jd', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}
