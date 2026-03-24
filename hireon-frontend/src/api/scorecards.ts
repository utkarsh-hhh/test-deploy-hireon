import api from './axios'
import type { Scorecard } from '@/types'

export const scorecardsApi = {
  submit: (data: {
    interview_id: string
    application_id?: string
    overall_rating: number
    recommendation: string
    criteria_scores?: { criterion: string; score: number; notes?: string }[]
    strengths?: string
    weaknesses?: string
    summary?: string
  }) => api.post<Scorecard>('/v1/scorecards', data),

  getForApplication: (applicationId: string | null) =>
    applicationId ? api.get<Scorecard[]>(`/v1/scorecards/application/${applicationId}`) : Promise.resolve({ data: [] }),

  get: (id: string) => api.get<Scorecard>(`/v1/scorecards/${id}`),
}
