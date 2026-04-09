export interface ImageRecord {
  id: string
  userId: string
  type: 'generate' | 'edit'
  prompt: string
  aspectRatio: string | null
  quality: string | null
  blobUrl: string
  sizeBytes: number | null
  sourceImages: string | null
  isFavorite: boolean
  createdAt: Date
}

export interface QuotaInfo {
  allowed: boolean
  dailyUsed: number
  dailyLimit: number
  monthlyUsed: number
  monthlyLimit: number
}

export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errorCode?: 'quota_exceeded' | 'auth_required' | 'validation_error'
  quota?: {
    dailyUsed: number
    dailyLimit: number
    monthlyUsed: number
    monthlyLimit: number
  }
}

export interface TaskStatusResult {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: { imageId: string; blobUrl: string }
  error?: string
  attempts: number
  maxAttempts: number
  createdAt: string
}

export interface GenerateTaskPayload {
  prompt: string
  aspectRatio: string
  quality: string
}

export interface EditTaskPayload {
  prompt: string
  sourceImageUrls: string[]
}
