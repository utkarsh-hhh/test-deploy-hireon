import api from './axios'
import type { PipelineData, ApplicationStage } from '@/types'

export const pipelineApi = {
  get: (jobId: string) => api.get<PipelineData>(`/v1/pipeline/${jobId}`),

  moveCard: (applicationId: string, stage: ApplicationStage, rejection_reason?: string) =>
    api.patch(`/v1/pipeline/${applicationId}/move`, { stage, rejection_reason }),
}
