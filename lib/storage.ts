import { put, del } from '@vercel/blob'

export async function uploadImage(
  userId: string,
  imageBuffer: Buffer
): Promise<{ url: string; size: number }> {
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.png`

  const blob = await put(filename, imageBuffer, {
    access: 'private',
    contentType: 'image/png',
  })

  return { url: blob.url, size: imageBuffer.length }
}

export async function deleteImage(url: string): Promise<void> {
  try {
    await del(url)
  } catch {
    // Non-fatal: blob may already be deleted
  }
}
