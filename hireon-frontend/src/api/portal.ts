import api from './axios'
import type { Application, Interview, Offer, Candidate } from '@/types'

export const portalApi = {
  register: (data: {
    email: string
    full_name: string
    password: string
    organization_slug: string
  }) => api.post('/v1/portal/register', data),

  myApplications: () => api.get<Application[]>('/v1/portal/my-applications'),

  myInterviews: () => api.get<Interview[]>('/v1/portal/my-interviews'),

  myOffers: () => api.get<Offer[]>('/v1/portal/my-offers'),

  respondOffer: (offerId: string, accept: boolean, decline_reason?: string) =>
    api.post(`/v1/portal/offers/${offerId}/respond`, { accept, decline_reason }),

  profile: () => api.get<Candidate>('/v1/portal/profile'),

  generatePrep: (applicationId: string) => api.get(`/v1/portal/applications/${applicationId}/prep-hub`),

  jobs: () => api.get<import('@/types').Job[]>('/v1/portal/jobs'),

  applyToJob: (jobId: string) => api.post<Application>(`/v1/portal/jobs/${jobId}/apply`),

  uploadResume: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Candidate>('/v1/portal/profile/resume', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
