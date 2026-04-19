import test from 'node:test'
import assert from 'node:assert/strict'
import { validateEditInput, isAllowedImageUrl } from './edit-validation'

test('isAllowedImageUrl accepts Vercel Blob https URLs', () => {
  assert.equal(
    isAllowedImageUrl('https://xxx.public.blob.vercel-storage.com/foo.png'),
    true
  )
})

test('isAllowedImageUrl rejects non-Vercel hosts', () => {
  assert.equal(isAllowedImageUrl('https://evil.example.com/foo.png'), false)
  assert.equal(isAllowedImageUrl('http://xxx.public.blob.vercel-storage.com/foo.png'), false)
  assert.equal(isAllowedImageUrl('not a url'), false)
})

test('validateEditInput rejects empty prompt', () => {
  const result = validateEditInput({ prompt: '', referenceImages: ['https://x.blob.vercel-storage.com/a.png'], modelIds: ['gemini-3.1-flash'] })
  assert.equal(result.ok, false)
  assert.match(result.ok === false ? result.error : '', /Prompt is required/)
})

test('validateEditInput rejects prompt over 2000 chars', () => {
  const result = validateEditInput({ prompt: 'x'.repeat(2001), referenceImages: ['https://x.blob.vercel-storage.com/a.png'], modelIds: ['gemini-3.1-flash'] })
  assert.equal(result.ok, false)
  assert.match(result.ok === false ? result.error : '', /2000 characters/)
})

test('validateEditInput rejects zero reference images', () => {
  const result = validateEditInput({ prompt: 'hi', referenceImages: [], modelIds: ['gemini-3.1-flash'] })
  assert.equal(result.ok, false)
  assert.match(result.ok === false ? result.error : '', /At least one reference/)
})

test('validateEditInput rejects more than 2 reference images', () => {
  const result = validateEditInput({
    prompt: 'hi',
    referenceImages: [
      'https://x.blob.vercel-storage.com/a.png',
      'https://x.blob.vercel-storage.com/b.png',
      'https://x.blob.vercel-storage.com/c.png',
    ],
    modelIds: ['gemini-3.1-flash'],
  })
  assert.equal(result.ok, false)
  assert.match(result.ok === false ? result.error : '', /At most 2/)
})

test('validateEditInput rejects SSRF reference URL', () => {
  const result = validateEditInput({
    prompt: 'hi',
    referenceImages: ['https://evil.example.com/a.png'],
    modelIds: ['gemini-3.1-flash'],
  })
  assert.equal(result.ok, false)
  assert.match(result.ok === false ? result.error : '', /Invalid reference image URL/)
})

test('validateEditInput rejects empty modelIds', () => {
  const result = validateEditInput({
    prompt: 'hi',
    referenceImages: ['https://x.blob.vercel-storage.com/a.png'],
    modelIds: [],
  })
  assert.equal(result.ok, false)
  assert.match(result.ok === false ? result.error : '', /At least one model/)
})

test('validateEditInput accepts well-formed input', () => {
  const result = validateEditInput({
    prompt: 'hello',
    referenceImages: ['https://x.blob.vercel-storage.com/a.png'],
    modelIds: ['gemini-3.1-flash'],
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.data.prompt, 'hello')
    assert.deepEqual(result.data.referenceImageUrls, ['https://x.blob.vercel-storage.com/a.png'])
  }
})
