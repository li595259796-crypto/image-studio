import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'images'

function generatePath(userId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 10)
  return `${userId}/${timestamp}-${random}.png`
}

export async function uploadImage(
  supabase: SupabaseClient,
  userId: string,
  imageBuffer: Buffer,
  filename?: string
): Promise<{ path: string; publicUrl: string }> {
  const path = filename ?? generatePath(userId)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, imageBuffer, {
      contentType: 'image/png',
      upsert: false,
    })

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  const publicUrl = getPublicUrl(supabase, path)

  return { path, publicUrl }
}

export async function deleteImage(
  supabase: SupabaseClient,
  path: string
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`)
  }
}

export function getPublicUrl(
  supabase: SupabaseClient,
  path: string
): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
