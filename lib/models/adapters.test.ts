import test from 'node:test'
import assert from 'node:assert/strict'

import { geminiFlashAdapter } from './gemini-flash.ts'
import { seedreamAdapter } from './seedream.ts'
import { tongyiAdapter } from './tongyi.ts'

test('gemini adapter extracts base64 image from 147ai proxy response', async (t) => {
  const originalFetch = global.fetch
  const originalKey = process.env.IMAGE_API_KEY
  process.env.IMAGE_API_KEY = 'test-proxy-key'

  const imageBase64 = Buffer.from([1, 2, 3]).toString('base64')
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: `Here is your image: data:image/png;base64,${imageBase64}`,
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  t.after(() => {
    global.fetch = originalFetch
    process.env.IMAGE_API_KEY = originalKey
  })

  const result = await geminiFlashAdapter.generate({
    prompt: 'Poster concept',
    aspectRatio: '16:9',
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.mimeType, 'image/png')
    assert.deepEqual(Array.from(result.data), [1, 2, 3])
  }
})

test('seedream adapter extracts b64_json without AK/SK signing', async (t) => {
  const originalFetch = global.fetch
  const originalKey = process.env.VOLCENGINE_ARK_API_KEY
  process.env.VOLCENGINE_ARK_API_KEY = 'test-ark-key'

  global.fetch = async (_input, init) => {
    assert.equal(
      (init?.headers as Record<string, string>)?.Authorization,
      'Bearer test-ark-key'
    )

    return new Response(
      JSON.stringify({
        data: [{ b64_json: Buffer.from([4, 5, 6]).toString('base64') }],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  t.after(() => {
    global.fetch = originalFetch
    process.env.VOLCENGINE_ARK_API_KEY = originalKey
  })

  const result = await seedreamAdapter.generate({
    prompt: 'Poster concept',
    aspectRatio: '1:1',
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(Array.from(result.data), [4, 5, 6])
  }
})

test('tongyi adapter downloads the temporary image URL before returning bytes', async (t) => {
  const originalFetch = global.fetch
  const originalKey = process.env.DASHSCOPE_API_KEY
  process.env.DASHSCOPE_API_KEY = 'test-dashscope-key'

  const calls: string[] = []
  global.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.toString()
    calls.push(url)

    if (url.includes('/multimodal-generation/generation')) {
      return new Response(
        JSON.stringify({
          output: {
            choices: [
              {
                message: {
                  content: [{ image: 'https://result.oss-cn-hangzhou.aliyuncs.com/generated.png', type: 'image' }],
                },
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(new Uint8Array([7, 8, 9]), {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    })
  }

  t.after(() => {
    global.fetch = originalFetch
    process.env.DASHSCOPE_API_KEY = originalKey
  })

  const result = await tongyiAdapter.generate({
    prompt: 'Poster concept',
    aspectRatio: '1:1',
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(Array.from(result.data), [7, 8, 9])
  }
  assert.equal(calls.length, 2)
  assert.match(calls[1], /aliyuncs\.com\/generated\.png/)
})
