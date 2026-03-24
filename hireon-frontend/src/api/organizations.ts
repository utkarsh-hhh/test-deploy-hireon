import api from './axios'
import type { Organization } from '@/types'

export const organizationsApi = {
  getMe: () => api.get<Organization>('/v1/organizations/me'),

  update: (data: Partial<Organization>) => api.put<Organization>('/v1/organizations/me', data),
}
