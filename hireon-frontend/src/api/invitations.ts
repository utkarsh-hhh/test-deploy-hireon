import axios from './axios'
import { AuthResponse } from '@/types'

export const invitationsApi = {
  verify: (token: string) => axios.get(`/v1/invitations/verify/${token}`),
  use: (token: string, data: { password?: string }) => axios.post(`/v1/invitations/use/${token}`, data),
}
