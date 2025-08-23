import axios from 'axios'
import { SubmissionStatus } from '@prisma/client'

export interface Author {
  name: string
  email: string
  institution: string
  isCorresponding: boolean
}

export interface SubmissionData {
  title: string
  abstract: string
  track: string
  authors: Author[]
  conferenceYear?: number
  status?: SubmissionStatus
  draftId?: string // 新增：用於指定要更新的草稿ID
  // 新增欄位
  paperType?: string
  keywords?: string
  fileInfo?: {
    name: string
    size: number
    type: string
    lastModified: number
  } | null
  agreements?: {
    originalWork: boolean
    noConflictOfInterest: boolean
    consentToPublish: boolean
  }
}

export interface Submission {
  id: string
  title: string
  abstract: string
  track: string
  status: SubmissionStatus
  serialNumber?: string
  createdAt: string
  updatedAt: string
  authors: {
    id: string
    name: string
    email: string
    affiliation: string
    isCorresponding: boolean
  }[]
  files: {
    id: string
    kind: string
    version: number
    originalName: string
  }[]
  decisions: {
    id: string
    result: string
    note?: string
    decidedAt: string
    decider: {
      displayName: string
    }
  }[]
  reviewAssignments: {
    id: string
    status: string
    review?: {
      id: string
      score: number
      recommendation: string
      commentToAuthor?: string
    }
  }[]
}

export interface SubmissionStats {
  draft: number
  submitted: number
  underReview: number
  revisionRequired: number
  accepted: number
  rejected: number
  withdrawn: number
}

export interface SubmissionsResponse {
  submissions: Submission[]
  stats: SubmissionStats
  conference: {
    id: string
    year: number
    title: string
    tracks: Record<string, string>
  }
}

export const submissionApi = {
  // 取得投稿列表
  async getSubmissions(year?: number, status?: string): Promise<SubmissionsResponse> {
    const params = new URLSearchParams()
    if (year) params.append('year', year.toString())
    if (status) params.append('status', status)
    // 添加時間戳避免快取
    params.append('_t', Date.now().toString())
    
    const response = await axios.get(`/api/submissions?${params.toString()}`)
    
    return response.data
  },

  // 取得單一投稿詳情
  async getSubmission(id: string): Promise<{ submission: Submission }> {
    // 添加時間戳避免快取
    const response = await axios.get(`/api/submissions/${id}?_t=${Date.now()}`)
    
    return response.data
  },

  // 建立新投稿
  async createSubmission(data: SubmissionData): Promise<{ submission: Submission; message: string }> {
    const response = await axios.post('/api/submissions', data)
    return response.data
  },

  // 更新投稿
  async updateSubmission(id: string, data: Partial<SubmissionData>): Promise<{ submission: Submission; message: string }> {
    const response = await axios.put(`/api/submissions/${id}`, data)
    return response.data
  },

  // 刪除投稿
  async deleteSubmission(id: string): Promise<{ message: string }> {
    const response = await axios.delete(`/api/submissions/${id}`)
    return response.data
  },

  // 保存草稿
  async saveDraft(data: SubmissionData): Promise<{ submission: Submission; message: string }> {
    // 如果有指定草稿ID，則更新現有草稿
    if (data.draftId) {
      return this.updateSubmission(data.draftId, { ...data, status: 'DRAFT' })
    } else {
      // 否則創建新草稿
      return this.createSubmission({ ...data, status: 'DRAFT' })
    }
  },

  // 提交投稿
  async submitSubmission(data: SubmissionData): Promise<{ submission: Submission; message: string; serialNumber?: string; emailNotificationSent?: boolean }> {
    // 如果有指定草稿ID，則更新現有草稿；否則創建新投稿
    if (data.draftId) {
      const response = await axios.put(`/api/submissions/${data.draftId}/submit`, data)
      return response.data
    } else {
      return this.createSubmission({ ...data, status: 'SUBMITTED' })
    }
  }
}

export const conferenceApi = {
  // 取得會議列表
  async getConferences(year?: number, active?: boolean): Promise<{ conferences: any[] }> {
    const params = new URLSearchParams()
    if (year) params.append('year', year.toString())
    if (active !== undefined) params.append('active', active.toString())
    
    const response = await axios.get(`/api/conferences?${params.toString()}`)
    return response.data
  }
}