export interface ImageRecord {
  id: string
  user_id: string
  type: 'generate' | 'edit'
  prompt: string
  aspect_ratio: string | null
  quality: string | null
  storage_path: string
  public_url: string | null
  size_bytes: number | null
  source_images: string[] | null
  created_at: string
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
}
