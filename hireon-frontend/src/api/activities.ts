import axiosInstance from './axios'

export interface Activity {
  id: string
  action: string
  resource_type: string
  resource_id: string
  details: any
  created_at: string
  user_id: string | null
}

export const activitiesApi = {
  list: (limit = 20) => axiosInstance.get<Activity[]>(`/v1/activities?limit=${limit}`),
}
