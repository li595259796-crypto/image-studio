import { put, del } from '@vercel/blob'

export async function uploadAvatar(
  userId: string,
  imageBuffer: Buffer
): Promise<{ url: string }> {
  const filename = `avatars/${userId}.png`
  const blob = await put(filename, imageBuffer, {
    access: 'public',
    contentType: 'image/png',
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
