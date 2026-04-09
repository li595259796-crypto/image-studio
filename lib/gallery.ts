export type GalleryTimeRange = 'today' | '7d' | '30d'

export function getGallerySinceDate(
  timeRange: GalleryTimeRange,
  now: Date = new Date()
): Date {
  const current = new Date(now)

  if (timeRange === 'today') {
    return new Date(
      Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDate()
      )
    )
  }

  const days = timeRange === '7d' ? 7 : 30

  return new Date(current.getTime() - days * 24 * 60 * 60 * 1000)
}
