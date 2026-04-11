import type { Locale } from './i18n'
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
  if (errorCode === 'upstream_timeout') {
    return locale === 'zh'
      ? '图像处理超时，请稍后重试。'
      : 'Image processing timed out. Please try again.'
  }

  if (errorCode === 'upstream_unavailable') {
    return locale === 'zh'
      ? '图像服务暂时不可用，请稍后再试。'
      : 'Image service is temporarily unavailable. Please try again.'
  }

  return fallback ?? (locale === 'zh' ? '处理失败，请稍后重试。' : 'Request failed. Please try again.')
}
