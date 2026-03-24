import api from './axios'
import type { Offer } from '@/types'

export const offersApi = {
  list: () => api.get<Offer[]>('/v1/offers'),

  create: (data: Partial<Offer> & { application_id: string }) =>
    api.post<Offer>('/v1/offers', data),

  get: (id: string) => api.get<Offer>(`/v1/offers/${id}`),

  update: (id: string, data: Partial<Offer>) => api.put<Offer>(`/v1/offers/${id}`, data),

  generatePdf: (id: string) => api.post<Offer>(`/v1/offers/${id}/generate-pdf`),

  send: (id: string) => api.post<Offer>(`/v1/offers/${id}/send`),

  respond: (id: string, accept: boolean, decline_reason?: string) =>
    api.post<Offer>(`/v1/offers/${id}/respond`, { accept, decline_reason }),

  revoke: (id: string) => api.delete(`/v1/offers/${id}`),
}
