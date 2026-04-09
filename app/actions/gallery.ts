'use server'

import { auth } from '@/lib/auth'
import {
  getUserImagesFiltered,
  getImageByIdAndUser,
  deleteImage as deleteImageRecord,
  toggleImageFavorite,
} from '@/lib/db/queries'
import type { GalleryTimeRange } from '@/lib/gallery'
import { deleteImage as deleteBlobImage } from '@/lib/storage'
import type { ActionResult, ImageRecord } from '@/lib/types'

interface GalleryResult {
  images: ImageRecord[]
  total: number
}

export async function getImages(
  offset: number = 0,
  limit: number = 20,
  filters?: {
    favoriteOnly?: boolean
    timeRange?: GalleryTimeRange
  }
): Promise<ActionResult<GalleryResult>> {
  try {
    const safeLimit = Math.min(Math.max(1, limit), 100)

    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const result = await getUserImagesFiltered(
      session.user.id,
      offset,
      safeLimit,
      filters
    )

    return {
      success: true,
      data: {
        images: result.images as ImageRecord[],
        total: result.total,
      },
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: message }
  }
}

export async function toggleFavoriteAction(
  imageId: string
): Promise<ActionResult<{ isFavorite: boolean }>> {
  try {
    if (!imageId?.trim()) {
      return { success: false, error: 'Image ID is required' }
    }

    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const isFavorite = await toggleImageFavorite(imageId, session.user.id)

    if (isFavorite === null) {
      return { success: false, error: 'Image not found' }
    }

    return {
      success: true,
      data: { isFavorite },
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

    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const image = await getImageByIdAndUser(imageId, session.user.id)

    if (!image) {
      return { success: false, error: 'Image not found' }
    }

    await deleteImageRecord(imageId, session.user.id)

    await deleteBlobImage(image.blobUrl).catch(() => {
      // Storage cleanup failure is non-fatal; DB record already removed
    })

    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: message }
  }
}
