'use server'

import { createClient } from '@/lib/supabase/server'
import { deleteImage as deleteStorageImage } from '@/lib/storage'
import type { ActionResult, ImageRecord } from '@/lib/types'

interface GalleryResult {
  images: ImageRecord[]
  total: number
}

export async function getImages(
  offset: number = 0,
  limit: number = 20
): Promise<ActionResult<GalleryResult>> {
  try {
    const safeLimit = Math.min(Math.max(1, limit), 100)
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const { data, error, count } = await supabase
      .from('images')
      .select('id, user_id, type, prompt, aspect_ratio, quality, storage_path, public_url, size_bytes, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1)

    if (error) {
      throw new Error(`Failed to fetch images: ${error.message}`)
    }

    return {
      success: true,
      data: {
        images: (data ?? []) as ImageRecord[],
        total: count ?? 0,
      },
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: message }
  }
}

export async function deleteImageAction(
  imageId: string
): Promise<ActionResult> {
  try {
    if (!imageId?.trim()) {
      return { success: false, error: 'Image ID is required' }
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const { data: image, error: fetchError } = await supabase
      .from('images')
      .select('storage_path')
      .eq('id', imageId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !image) {
      return { success: false, error: 'Image not found' }
    }

    const { error: deleteError } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', user.id)

    if (deleteError) {
      return { success: false, error: 'Failed to delete image' }
    }

    await deleteStorageImage(supabase, image.storage_path).catch(() => {
      // Storage cleanup failure is non-fatal; DB record already removed
    })

    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: message }
  }
}
