import type { Locale } from '@/lib/i18n'
import type { TaskStatusResult } from '@/lib/types'

export function getTaskStatusMessage(
  status: TaskStatusResult['status'],
  elapsed: number,
  locale: Locale
): string {
  if (status === 'pending') {
    return locale === 'zh' ? `排队中... ${elapsed}s` : `Queued... ${elapsed}s`
  }

  if (status === 'processing') {
    return locale === 'zh' ? `生成中... ${elapsed}s` : `Generating... ${elapsed}s`
  }

  return ''
}
