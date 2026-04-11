import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
import { ImageApiError } from './image-api.ts'
// @ts-expect-error Direct .ts import keeps node --test working in this repo.
import {
  getImageActionErrorMessage,
  toImageActionFailureResult,
} from './image-action-error.ts'

test('maps typed timeout errors to upstream_timeout action results', () => {
  const result = toImageActionFailureResult(
    'generate',
    new ImageApiError('timeout', 'Timed out after 60s')
  )

  assert.equal(result.success, false)
  assert.equal(result.errorCode, 'upstream_timeout')
  assert.match(result.error ?? '', /timed out/i)
})

test('maps upstream and malformed image-api failures to upstream_unavailable action results', () => {
  const upstreamHttp = toImageActionFailureResult(
    'generate',
    new ImageApiError('upstream_http', 'Image API returned 503', { status: 503 })
  )
  const invalidResponse = toImageActionFailureResult(
    'edit',
    new ImageApiError('invalid_response', 'Response did not contain an image')
  )

  assert.equal(upstreamHttp.errorCode, 'upstream_unavailable')
  assert.equal(invalidResponse.errorCode, 'upstream_unavailable')
})

test('returns localized user-facing copy for typed upstream failures', () => {
  assert.equal(
    getImageActionErrorMessage('en', 'upstream_timeout', 'fallback'),
    'Image processing timed out. Please try again.'
  )
  assert.equal(
    getImageActionErrorMessage('zh', 'upstream_unavailable', 'fallback'),
    '图像服务暂时不可用，请稍后再试。'
  )
  assert.equal(
    getImageActionErrorMessage('en', 'validation_error', 'fallback'),
    'fallback'
  )
})
