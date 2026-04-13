import { put, del } from '@vercel/blob'

export async function uploadImage(
  userId: string,
  imageBuffer: Buffer | Uint8Array,
  contentType: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png'
): Promise<{ url: string; size: number }> {
  const body = Buffer.isBuffer(imageBuffer)
    ? imageBuffer
    : Buffer.from(imageBuffer)
  const extension =
    contentType === 'image/jpeg'
      ? 'jpg'
      : contentType === 'image/webp'
        ? 'webp'
        : 'png'
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`

  const blob = await put(filename, body, {
    access: 'public',
    contentType,
  })

  return { url: blob.url, size: body.length }
}

export async function deleteImage(url: string): Promise<void> {
  try {
    await del(url)
  } catch {
    // Non-fatal: blob may already be deleted
  }
}
