import api from './axios'

export interface TalentStats {
  total_candidates: number
  re_matched_count: number
  avg_hire_time: string
}

export const talentPoolApi = {
  getStats: () => api.get<TalentStats>('/v1/talent-pool/stats'),
}
