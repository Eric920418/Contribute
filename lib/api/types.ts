// API 回應格式
export interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: string
  details?: any
}

// 分頁參數
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 分頁回應
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// 使用者相關類型
export interface User {
  id: string
  email: string
  displayName: string
  orcid?: string
  emailVerified: boolean
  roles: string[]
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  confirmPassword: string
  displayName: string
  orcid?: string
  agreeToTerms: boolean
}

export interface AuthResponse {
  user: User
  message: string
}

// 研討會相關類型
export interface Conference {
  id: string
  year: number
  title: string
  tracks: string[]
  settings: ConferenceSettings
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ConferenceSettings {
  submissionDeadline: string
  reviewDeadline: string
  notificationDate: string
  maxFileSize: number
  allowedFileTypes: string[]
  reviewersPerSubmission: number
  enableDoubleBlind: boolean
}

// 投稿相關類型
export interface Submission {
  id: string
  conferenceId: string
  title: string
  abstract: string
  track: string
  status: SubmissionStatus
  createdBy: string
  decisionNote?: string
  serialNumber?: string
  createdAt: string
  updatedAt: string
  
  // 關聯資料
  conference?: Conference
  creator?: User
  authors?: SubmissionAuthor[]
  files?: FileAsset[]
  reviews?: Review[]
  decisions?: Decision[]
}

export interface SubmissionAuthor {
  id: string
  submissionId: string
  name: string
  email: string
  affiliation: string
  isCorresponding: boolean
}

export interface CreateSubmissionRequest {
  title: string
  abstract: string
  track: string
  authors: Omit<SubmissionAuthor, 'id' | 'submissionId'>[]
}

export interface UpdateSubmissionRequest extends Partial<CreateSubmissionRequest> {
  id: string
}

export interface SubmitSubmissionResponse {
  message: string
  submission: Submission
  serialNumber: string
  emailNotificationSent: boolean
}

// 檔案相關類型
export interface FileAsset {
  id: string
  submissionId: string
  kind: FileAssetKind
  version: number
  path: string
  originalName: string
  size: number
  mimeType: string
  checksum: string
  createdAt: string
}

export interface UploadFileRequest {
  submissionId: string
  kind: FileAssetKind
  file: File
}

// 審稿相關類型
export interface ReviewAssignment {
  id: string
  submissionId: string
  reviewerId: string
  status: ReviewAssignmentStatus
  dueAt?: string
  createdAt: string
  updatedAt: string
  
  // 關聯資料
  submission?: Submission
  reviewer?: User
  review?: Review
}

export interface Review {
  id: string
  assignmentId: string
  score: number
  commentToEditor?: string
  commentToAuthor?: string
  recommendation: ReviewRecommendation
  submittedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateReviewRequest {
  assignmentId: string
  score: number
  commentToEditor?: string
  commentToAuthor?: string
  recommendation: ReviewRecommendation
}

// 決議相關類型
export interface Decision {
  id: string
  submissionId: string
  decidedBy: string
  result: DecisionResult
  note?: string
  decidedAt: string
  
  // 關聯資料
  submission?: Submission
  decider?: User
}

export interface CreateDecisionRequest {
  submissionId: string
  result: DecisionResult
  note?: string
}

// 通知相關類型
export interface NotificationLog {
  id: string
  type: NotificationType
  to: string
  payload: any
  sentAt?: string
  status: NotificationStatus
  errorMsg?: string
  createdAt: string
}

// 列舉類型
export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN'
}

export enum FileAssetKind {
  MANUSCRIPT = 'MANUSCRIPT',
  COVER_LETTER = 'COVER_LETTER',
  FIGURE = 'FIGURE',
  SUPPLEMENTARY = 'SUPPLEMENTARY'
}

export enum ReviewAssignmentStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  SUBMITTED = 'SUBMITTED'
}

export enum ReviewRecommendation {
  ACCEPT = 'ACCEPT',
  MINOR_REVISION = 'MINOR_REVISION',
  MAJOR_REVISION = 'MAJOR_REVISION',
  REJECT = 'REJECT'
}

export enum DecisionResult {
  ACCEPT = 'ACCEPT',
  REVISE = 'REVISE',
  REJECT = 'REJECT'
}

export enum NotificationType {
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  PASSWORD_RESET = 'PASSWORD_RESET',
  SUBMISSION_RECEIVED = 'SUBMISSION_RECEIVED',
  ASSIGNMENT_INVITE = 'ASSIGNMENT_INVITE',
  ASSIGNMENT_REMINDER = 'ASSIGNMENT_REMINDER',
  REVIEW_SUBMITTED = 'REVIEW_SUBMITTED',
  DECISION_NOTICE = 'DECISION_NOTICE',
  REVISION_REQUEST = 'REVISION_REQUEST',
  FINAL_ACCEPT = 'FINAL_ACCEPT'
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  RETRY = 'RETRY'
}