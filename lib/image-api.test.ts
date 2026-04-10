// TEMP-DIAGNOSIS: delete at teardown (covers instrumentation-only behaviour).
import test, { mock } from 'node:test'
import assert from 'node:assert/strict'

// CRITICAL: image-api.ts reads IMAGE_API_KEY / IMAGE_API_URL / IMAGE_MODEL
// at MODULE LOAD TIME via top-level `const API_KEY = process.env.IMAGE_API_KEY ?? ''`.
// If we static-imported editImage at the top of this file, the module would
// snapshot API_KEY as '' before any test body runs, and the first test call
// would throw "IMAGE_API_KEY environment variable is not set".
//
// Fix: set the env vars FIRST, then use a top-level `await import(...)` so
// the module is evaluated after env is populated. Node 20 ESM supports TLA.
process.env.IMAGE_API_KEY = 'test-key'
process.env.IMAGE_API_URL = 'https://test-endpoint.invalid/v1/chat/completions'
process.env.IMAGE_MODEL = 'test-model'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
const { editImage } = await import('./image-api.ts')

// A valid-looking 147ai response body. The base64 payload decodes to "hello"
// but the test only cares that extractImageBuffer() finds *something*.
const VALID_BODY = JSON.stringify({
  choices: [
    {
      message: {
        content: 'data:image/png;base64,aGVsbG8=',
      },
    },
  ],
})

function installFetchMock(): void {
  mock.method(globalThis, 'fetch', async () =>
    new Response(VALID_BODY, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  )
}

test('editImage populates timingOut with e0..e6 when opts.timingOut provided', async () => {
  installFetchMock()

  const timingOut: Record<string, number> = {}
  await editImage('test prompt', [Buffer.from('hello')], {
    traceId: 'testtrac',
    timingOut,
  })

  // All six phase markers present and numeric.
  for (const key of ['e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6']) {
    assert.equal(typeof timingOut[key], 'number', `${key} should be a number`)
  }
  // e0 is the baseline — always 0.
  assert.equal(timingOut.e0, 0)
  // Every later phase is >= earlier phase (monotonic, all relative to t0).
  assert.ok(timingOut.e6 >= timingOut.e5)
  assert.ok(timingOut.e5 >= timingOut.e4)
  assert.ok(timingOut.e4 >= timingOut.e3)
  assert.ok(timingOut.e3 >= timingOut.e2)
  assert.ok(timingOut.e2 >= timingOut.e1)

  mock.restoreAll()
})

test('editImage generates a default traceId when opts omitted', async () => {
  installFetchMock()

  // No opts at all — existing callers compile unchanged.
  const result = await editImage('test', [Buffer.from('x')])
  assert.ok(Buffer.isBuffer(result))

  mock.restoreAll()
})

test('editImage still works when only traceId is passed (no timingOut)', async () => {
  installFetchMock()

  const result = await editImage('test', [Buffer.from('x')], { traceId: 'abcd1234' })
  assert.ok(Buffer.isBuffer(result))

  mock.restoreAll()
})
