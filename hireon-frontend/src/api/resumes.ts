import api from './axios'
import type { Candidate } from '@/types'

export interface JobRequirements {
  job_id?: string
  role_title?: string
  required_skills?: string   // comma-separated
  min_experience?: number
  match_threshold?: number
}

export const resumesApi = {
  upload: (candidateId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Candidate>(`/v1/resumes/upload/${candidateId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  uploadAndCreate: (file: File, jobReqs?: JobRequirements) => {
    const form = new FormData()
    form.append('file', file)
    if (jobReqs?.job_id) form.append('job_id', jobReqs.job_id)
    if (jobReqs?.role_title) form.append('role_title', jobReqs.role_title)
    if (jobReqs?.required_skills) form.append('required_skills', jobReqs.required_skills)
    if (jobReqs?.min_experience != null) form.append('min_experience', String(jobReqs.min_experience))
    if (jobReqs?.match_threshold != null) form.append('match_threshold', String(jobReqs.match_threshold))
    return api.post<Candidate>('/v1/resumes/upload-and-create', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
