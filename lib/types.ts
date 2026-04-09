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
