export function getPreloadableSourceUrl(
  sourceUrl: string | null,
  existingFileCount: number
): string | null {
  if (!sourceUrl || existingFileCount > 0) {
    return null
  }

  const trimmed = sourceUrl.trim()

  if (!trimmed.startsWith('https://')) {
    return null
  }

  return trimmed
}
