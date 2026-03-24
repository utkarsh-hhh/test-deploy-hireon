import api from './axios'
import type { Candidate, PaginatedResponse } from '@/types'

export const talentPoolApi = {
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    skill?: string
    tag?: string
    min_experience?: number
  }) => api.get<PaginatedResponse<Candidate>>('/v1/talent-pool', { params }),

  addTag: (candidateId: string, tag: string) =>
    api.post(`/v1/talent-pool/${candidateId}/tag`, null, { params: { tag } }),

  getStats: () => api.get<{
    total_candidates: number
    re_matched_count: number
    avg_hire_time: string
  }>('/v1/talent-pool/stats'),

  getSuggestedMatches: () => api.get<Array<{
    job_id: string
    job_title: string
    candidates: Array<{
      id: string
      full_name: string
      current_title: string
      years_experience: number
      match_score: number
      skills: string[]
      avatar_url: string | null
    }>
  }>>('/v1/talent-pool/suggested-matches'),
}
