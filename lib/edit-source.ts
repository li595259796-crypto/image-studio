export function getPreloadableSourceUrl(
  sourceUrl: string | null,
  existingFileCount: number
): string | null {
  if (!sourceUrl || existingFileCount > 0) return null
  const trimmed = sourceUrl.trim()
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:') return null
    return parsed.href
  } catch {
    return null
  }
}
