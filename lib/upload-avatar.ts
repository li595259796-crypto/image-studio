import { put, del } from '@vercel/blob'

export async function uploadAvatar(
  userId: string,
  imageBuffer: Buffer,
  contentType: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png'
): Promise<{ url: string }> {
  const ext = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1]
  const filename = `avatars/${userId}.${ext}`
  const blob = await put(filename, imageBuffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  })

  return { url: blob.url }
}

export async function deleteAvatar(url: string): Promise<void> {
  try {
    await del(url)
  } catch {
    // Non-fatal
  }
}
