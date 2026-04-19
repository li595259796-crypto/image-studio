import { copy, type Locale } from '@/lib/i18n'
import type { ActionResult, ImageResult } from './types'

type ImageOperation = 'generate' | 'edit'

function isImageApiError(
  error: unknown
): error is Error & { kind: string; status?: number } {
  return (
    error instanceof Error &&
    error.name === 'ImageApiError' &&
    typeof (error as { kind?: unknown }).kind === 'string'
  )
}

export function toImageActionFailureResult(
  operation: ImageOperation,
  error: unknown
): ActionResult<ImageResult> {
  if (isImageApiError(error)) {
    if (error.kind === 'timeout') {
      return {
        success: false,
        errorCode: 'upstream_timeout',
        error: 'Image processing timed out. Please try again.',
      }
    }

    if (
      error.kind === 'upstream_http' ||
      error.kind === 'invalid_response' ||
      error.kind === 'misconfigured' ||
      error.kind === 'network'
    ) {
      return {
        success: false,
        errorCode: 'upstream_unavailable',
        error: 'Image service is temporarily unavailable. Please try again.',
      }
    }
  }

  return {
    success: false,
    error:
      operation === 'generate'
        ? 'Failed to generate image. Please try again.'
        : 'Failed to edit image. Please try again.',
  }
}

export function getImageActionErrorMessage(
  locale: Locale,
  errorCode: ActionResult['errorCode'] | undefined,
  fallback?: string
): string {
  const dict = copy[locale].imageActionError

  switch (errorCode) {
    case 'quota_exceeded':
      return dict.quotaExceeded
    case 'upstream_timeout':
      return dict.timeout
    case 'upstream_unavailable':
      return dict.upstreamUnavailable
    default:
      return fallback ?? dict.generic
  }
}
