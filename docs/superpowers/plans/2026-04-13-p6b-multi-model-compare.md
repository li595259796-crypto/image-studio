# P6B Multi-Model Compare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first multi-model generation slice to the canvas workbench: one request can fan out to multiple providers, stream per-model results back into the canvas, persist `generationJobs`, and keep the hot autosave path working with a dedicated `/api/canvas/save` route.

**Architecture:** Keep P6A's canvas persistence and autosave logic intact, and add a separate generation pipeline beside it. The backend gets a provider-agnostic adapter layer, `generationJobs` persistence, rate-limit / quota checks, and a single SSE route (`/api/generate`) that authenticates once, validates once, and streams results as each model finishes. The frontend keeps Excalidraw as the canvas engine, adds a right-side generation panel plus placeholder/result cards, and listens to the SSE stream without coupling model logic into canvas autosave.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Drizzle ORM, Vercel Postgres, Vercel Blob, Excalidraw, node:test

---

## File Map

- Create: `lib/models/types.ts` - provider ids, model ids, request/response contracts, and `AdapterResult`
- Create: `lib/models/constants.ts` - allowed model ids, model metadata, aspect-ratio whitelist, provider registry helpers
- Create: `lib/models/gemini-flash.ts` - Google image adapter built on the existing upstream wrapper
- Create: `lib/models/seedream.ts` - Bytedance / Seedream adapter
- Create: `lib/models/tongyi.ts` - Alibaba / Tongyi adapter
- Create: `lib/models/router.ts` - adapter lookup and per-model execution orchestration
- Create: `lib/models/registry.test.ts` - pure tests for model metadata / whitelist behavior
- Create: `lib/models/router.test.ts` - pure tests for adapter execution and `AdapterResult` handling
- Create: `lib/generation/request.ts` - request parsing, input validation, and model selection normalization for `/api/generate`
- Create: `lib/generation/request.test.ts` - pure tests for request validation and deduping
- Create: `lib/generation/sse.ts` - helper to serialize SSE messages consistently
- Create: `lib/generation/sse.test.ts` - pure tests for SSE message formatting
- Create: `lib/db/generation-queries.ts` - generation job CRUD, recovery lookup, per-minute rate-limit queries, and usage inserts for the new flow
- Create: `app/api/generate/route.ts` - authenticated SSE route handler for fan-out image generation
- Create: `app/api/canvas/save/route.ts` - keepalive-safe autosave endpoint used during `beforeunload`
- Create: `components/canvas/generation-panel.tsx` - prompt / model / aspect ratio controls on the canvas page
- Create: `components/canvas/generation-result-strip.tsx` - compact list of active/completed model runs
- Create: `hooks/use-canvas-generation-stream.ts` - client hook that starts the SSE run and applies streamed updates
- Create: `lib/canvas/generation-elements.ts` - pure helpers that create placeholder and result elements for Excalidraw
- Create: `lib/canvas/generation-elements.test.ts` - pure tests for placeholder/result element generation
- Modify: `lib/db/schema.ts` - add `generationJobs`, extend `images` and `usageLogs` for model/provider/group metadata, leave `userApiKeys` for P6C
- Modify: `lib/db/queries.ts` - update `getQuotaInfo()` to count only `quotaSource = 'platform'`
- Modify: `lib/image-api.ts` - factor provider-specific transport helpers so Gemini can reuse timeout/error normalization cleanly
- Modify: `lib/storage.ts` - accept `Uint8Array` uploads in addition to `Buffer`
- Modify: `components/canvas/canvas-workspace.tsx` - mount the generation panel beside the board and pass generation callbacks
- Modify: `components/canvas/excalidraw-board.tsx` - expose an imperative bridge for inserting placeholder and image elements into the board
- Modify: `hooks/use-canvas-autosave.ts` - keep current `canvasId, initialSerialized` signature and let `beforeunload` hit `/api/canvas/save`
- Modify: `package.json` / `package-lock.json` - only if provider SDKs are truly required; prefer `fetch` first to keep P6B lean

---

## Task 1: Lock Model Contracts, Whitelists, And Request Parsing

**Files:**
- Create: `lib/models/types.ts`
- Create: `lib/models/constants.ts`
- Create: `lib/models/registry.test.ts`
- Create: `lib/generation/request.ts`
- Create: `lib/generation/request.test.ts`

- [ ] **Step 1: Write the failing pure tests for model metadata and request validation**

```ts
// lib/models/registry.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error direct TS import for node --test in this repo
import {
  ALLOWED_MODEL_IDS,
  getModelDefinition,
  supportsReferenceImages,
} from './constants.ts'

test('only allows the P6B image model ids', () => {
  assert.deepEqual(ALLOWED_MODEL_IDS, [
    'gemini-2.5-flash',
    'seedream-5.0',
    'tongyi-wanx2.1',
  ])
})

test('returns metadata for a known model id', () => {
  const model = getModelDefinition('gemini-2.5-flash')

  assert.equal(model.provider, 'google')
  assert.equal(model.label, 'Gemini Flash')
})

test('reports reference-image support from the model registry', () => {
  assert.equal(supportsReferenceImages('gemini-2.5-flash'), false)
  assert.equal(supportsReferenceImages('seedream-5.0'), true)
})
```

```ts
// lib/generation/request.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error direct TS import for node --test in this repo
import { parseGenerateRequest } from './request.ts'

test('dedupes model ids while preserving order', () => {
  const parsed = parseGenerateRequest({
    prompt: 'Poster concept',
    aspectRatio: '16:9',
    canvasId: 'canvas-123',
    modelIds: ['gemini-2.5-flash', 'gemini-2.5-flash', 'seedream-5.0'],
  })

  assert.deepEqual(parsed.modelIds, ['gemini-2.5-flash', 'seedream-5.0'])
})

test('rejects unknown model ids before the route touches adapters', () => {
  assert.throws(
    () =>
      parseGenerateRequest({
        prompt: 'Poster concept',
        aspectRatio: '16:9',
        canvasId: 'canvas-123',
        modelIds: ['evil-http-proxy'],
      }),
    /Unsupported model id/
  )
})
```

- [ ] **Step 2: Run the tests to confirm the modules do not exist yet**

Run: `node --test lib/models/registry.test.ts lib/generation/request.test.ts`

Expected: FAIL with missing modules such as `./constants.ts` or `./request.ts`

- [ ] **Step 3: Implement the shared contracts and metadata**

```ts
// lib/models/types.ts
export type ModelProvider = 'google' | 'bytedance' | 'alibaba' | '147ai'

export type ModelId =
  | 'gemini-2.5-flash'
  | 'seedream-5.0'
  | 'tongyi-wanx2.1'

export type QuotaSource = 'platform' | 'byok'

export interface GenerateOptions {
  prompt: string
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  referenceImages?: Uint8Array[]
}

export type AdapterResult =
  | {
      ok: true
      data: Uint8Array
      mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
      durationMs: number
    }
  | {
      ok: false
      errorCode:
        | 'timeout'
        | 'provider_error'
        | 'invalid_response'
        | 'misconfigured'
        | 'rate_limited'
      message: string
      durationMs: number
      status?: number
    }

export interface ModelDefinition {
  id: ModelId
  label: string
  provider: ModelProvider
  supportsReferenceImages: boolean
}

export interface ModelAdapter {
  definition: ModelDefinition
  generate(options: GenerateOptions): Promise<AdapterResult>
}
```

```ts
// lib/models/constants.ts
import type { ModelDefinition, ModelId } from './types.ts'

export const MODEL_DEFINITIONS = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini Flash',
    provider: 'google',
    supportsReferenceImages: false,
  },
  {
    id: 'seedream-5.0',
    label: 'Seedream 5.0',
    provider: 'bytedance',
    supportsReferenceImages: true,
  },
  {
    id: 'tongyi-wanx2.1',
    label: 'Tongyi Wanx 2.1',
    provider: 'alibaba',
    supportsReferenceImages: true,
  },
] as const satisfies readonly ModelDefinition[]

export const ALLOWED_MODEL_IDS = MODEL_DEFINITIONS.map((item) => item.id)

export const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const

export function getModelDefinition(modelId: ModelId): ModelDefinition {
  const found = MODEL_DEFINITIONS.find((item) => item.id === modelId)
  if (!found) {
    throw new Error(`Unsupported model id: ${modelId}`)
  }
  return found
}

export function supportsReferenceImages(modelId: ModelId): boolean {
  return getModelDefinition(modelId).supportsReferenceImages
}
```

```ts
// lib/generation/request.ts
import { ALLOWED_MODEL_IDS, VALID_ASPECT_RATIOS } from '@/lib/models/constants'
import type { ModelId } from '@/lib/models/types'

export interface ParsedGenerateRequest {
  prompt: string
  aspectRatio: (typeof VALID_ASPECT_RATIOS)[number]
  canvasId: string
  modelIds: ModelId[]
}

export function parseGenerateRequest(raw: Record<string, unknown>): ParsedGenerateRequest {
  const prompt = typeof raw.prompt === 'string' ? raw.prompt.trim() : ''
  if (!prompt) {
    throw new Error('Prompt is required')
  }

  const canvasId = typeof raw.canvasId === 'string' ? raw.canvasId : ''
  if (!canvasId) {
    throw new Error('Canvas id is required')
  }

  const aspectRatio = raw.aspectRatio
  if (
    typeof aspectRatio !== 'string' ||
    !VALID_ASPECT_RATIOS.includes(
      aspectRatio as (typeof VALID_ASPECT_RATIOS)[number]
    )
  ) {
    throw new Error('Invalid aspect ratio')
  }

  if (!Array.isArray(raw.modelIds) || raw.modelIds.length === 0) {
    throw new Error('At least one model must be selected')
  }

  const deduped: ModelId[] = []
  for (const modelId of raw.modelIds) {
    if (typeof modelId !== 'string' || !ALLOWED_MODEL_IDS.includes(modelId as ModelId)) {
      throw new Error(`Unsupported model id: ${String(modelId)}`)
    }
    if (!deduped.includes(modelId as ModelId)) {
      deduped.push(modelId as ModelId)
    }
  }

  return { prompt, aspectRatio, canvasId, modelIds: deduped }
}
```

- [ ] **Step 4: Re-run the pure tests**

Run: `node --test lib/models/registry.test.ts lib/generation/request.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the contract layer**

```bash
git add lib/models/types.ts lib/models/constants.ts lib/models/registry.test.ts lib/generation/request.ts lib/generation/request.test.ts
git commit -m "feat(models): add multi-model contracts and request parsing"
```

## Task 2: Add Generation Persistence, Platform-Only Quota Reads, And Keepalive Autosave

**Files:**
- Create: `lib/db/generation-queries.ts`
- Create: `app/api/canvas/save/route.ts`
- Create: `lib/generation/sse.ts`
- Create: `lib/generation/sse.test.ts`
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/queries.ts`

- [ ] **Step 1: Write a failing pure test for SSE payload formatting**

```ts
// lib/generation/sse.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error direct TS import for node --test in this repo
import { serializeSseEvent } from './sse.ts'

test('serializes a named SSE event with a JSON payload', () => {
  const event = serializeSseEvent('job_completed', {
    modelId: 'gemini-2.5-flash',
    imageId: 'img-123',
  })

  assert.match(event, /^event: job_completed/m)
  assert.match(event, /^data: \{"modelId":"gemini-2\.5-flash","imageId":"img-123"\}$/m)
  assert.match(event, /\n\n$/)
})
```

- [ ] **Step 2: Run the test to confirm the helper does not exist yet**

Run: `node --test lib/generation/sse.test.ts`

Expected: FAIL with missing module `./sse.ts`

- [ ] **Step 3: Extend the schema and query layer for P6B persistence**

```ts
// lib/db/schema.ts
export const generationJobs = pgTable(
  'generationJobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('groupId').notNull(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    canvasId: uuid('canvasId').references(() => canvases.id, {
      onDelete: 'set null',
    }),
    modelId: text('modelId').notNull(),
    provider: text('provider').notNull(),
    quotaSource: text('quotaSource')
      .$type<'platform' | 'byok'>()
      .default('platform')
      .notNull(),
    status: text('status')
      .$type<'processing' | 'completed' | 'failed'>()
      .default('processing')
      .notNull(),
    prompt: text('prompt').notNull(),
    aspectRatio: text('aspectRatio'),
    imageId: uuid('imageId').references(() => images.id, {
      onDelete: 'set null',
    }),
    errorCode: text('errorCode'),
    error: text('error'),
    durationMs: integer('durationMs'),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completedAt', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('generation_jobs_canvas_status_idx').on(table.canvasId, table.status),
    index('generation_jobs_group_idx').on(table.groupId),
    index('generation_jobs_user_created_idx').on(table.userId, table.createdAt),
  ]
)

// extend images
model: text('model'),
provider: text('provider'),
groupId: uuid('groupId'),
durationMs: integer('durationMs'),

// extend usageLogs
model: text('model'),
provider: text('provider'),
quotaSource: text('quotaSource').$type<'platform' | 'byok'>(),
groupId: uuid('groupId'),
durationMs: integer('durationMs'),
canvasId: uuid('canvasId').references(() => canvases.id, { onDelete: 'set null' }),
```

```ts
// lib/db/queries.ts
.where(
  and(
    eq(usageLogs.userId, userId),
    eq(usageLogs.quotaSource, 'platform'),
    gte(usageLogs.createdAt, startOfDay)
  )
)
```

```ts
// lib/db/generation-queries.ts
export async function createGenerationJobs(input: {
  groupId: string
  userId: string
  canvasId: string
  prompt: string
  aspectRatio: string
  quotaSource: 'platform' | 'byok'
  models: Array<{ modelId: string; provider: string }>
}) {
  return db
    .insert(generationJobs)
    .values(
      input.models.map((model) => ({
        groupId: input.groupId,
        userId: input.userId,
        canvasId: input.canvasId,
        prompt: input.prompt,
        aspectRatio: input.aspectRatio,
        quotaSource: input.quotaSource,
        modelId: model.modelId,
        provider: model.provider,
      }))
    )
    .returning()
}
```

- [ ] **Step 4: Add the keepalive autosave route that reuses P6A validation**

```ts
// app/api/canvas/save/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { parseCanvasState, assertCanvasStateWithinLimit } from '@/lib/canvas/state'
import { saveCanvasStateForUser } from '@/lib/db/canvas-queries'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { canvasId?: string; state?: unknown }
  if (!body.canvasId) {
    return NextResponse.json({ error: 'Canvas id is required' }, { status: 400 })
  }

  try {
    const state = parseCanvasState(body.state)
    assertCanvasStateWithinLimit(state)
    const canvas = await saveCanvasStateForUser(session.user.id, body.canvasId, state)

    if (!canvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, id: canvas.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid canvas state' },
      { status: 400 }
    )
  }
}
```

- [ ] **Step 5: Implement the SSE helper and verify the new tests**

```ts
// lib/generation/sse.ts
export function serializeSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}
```

Run: `node --test lib/generation/sse.test.ts`

Expected: PASS

- [ ] **Step 6: Apply the DB change and run safety checks**

Run: `npx drizzle-kit push --config drizzle.config.ts`

Expected: SUCCESS without destructive prompts

Run: `npm run lint`

Expected: PASS

- [ ] **Step 7: Commit the persistence slice**

```bash
git add lib/db/schema.ts lib/db/queries.ts lib/db/generation-queries.ts app/api/canvas/save/route.ts lib/generation/sse.ts lib/generation/sse.test.ts
git commit -m "feat(generation): add persistence and autosave routes"
```

## Task 3: Ship The First Streaming Backend With Gemini Flash

**Files:**
- Create: `lib/models/router.ts`
- Create: `lib/models/router.test.ts`
- Create: `lib/models/gemini-flash.ts`
- Modify: `lib/image-api.ts`
- Modify: `lib/storage.ts`
- Create: `app/api/generate/route.ts`

- [ ] **Step 1: Write the failing router test for mixed adapter outcomes**

```ts
// lib/models/router.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error direct TS import for node --test in this repo
import { runModelGeneration } from './router.ts'

test('returns an ok result without throwing when one adapter fails', async () => {
  const result = await runModelGeneration({
    adapter: {
      definition: {
        id: 'gemini-2.5-flash',
        label: 'Gemini Flash',
        provider: 'google',
        supportsReferenceImages: false,
      },
      async generate() {
        return {
          ok: true,
          data: new Uint8Array([1, 2, 3]),
          mimeType: 'image/png',
          durationMs: 12,
        }
      },
    },
    options: { prompt: 'cat', aspectRatio: '1:1' },
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.durationMs, 12)
  }
})
```

- [ ] **Step 2: Run the router test to confirm the module does not exist yet**

Run: `node --test lib/models/router.test.ts`

Expected: FAIL with missing module `./router.ts`

- [ ] **Step 3: Refactor the upstream transport so Gemini can reuse timeout/error normalization**

```ts
// lib/image-api.ts
export async function callConfiguredImageApi(
  config: {
    apiKey: string
    apiUrl: string
    model: string
  },
  messages: ApiMessage[]
): Promise<ApiResponse> {
  // existing timeout + abort + response-shape validation logic,
  // but parameterized by apiKey / apiUrl / model
}

export function extractImageBytes(content: string): Uint8Array {
  const match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/)
  if (!match) {
    throw new ImageApiError(
      'invalid_response',
      'Image API response did not contain a base64 image'
    )
  }
  return Uint8Array.from(Buffer.from(match[1], 'base64'))
}
```

```ts
// lib/models/gemini-flash.ts
import {
  ImageApiError,
  callConfiguredImageApi,
  extractImageBytes,
} from '@/lib/image-api'
import type { AdapterResult, ModelAdapter } from './types'

export const geminiFlashAdapter: ModelAdapter = {
  definition: {
    id: 'gemini-2.5-flash',
    label: 'Gemini Flash',
    provider: 'google',
    supportsReferenceImages: false,
  },
  async generate(options): Promise<AdapterResult> {
    const startedAt = Date.now()

    try {
      const result = await callConfiguredImageApi(
        {
          apiKey: process.env.GEMINI_API_KEY ?? process.env.IMAGE_API_KEY ?? '',
          apiUrl:
            process.env.GEMINI_IMAGE_API_URL ??
            process.env.IMAGE_API_URL ??
            'https://147ai.com/v1/chat/completions',
          model:
            process.env.GEMINI_IMAGE_MODEL ??
            process.env.IMAGE_MODEL ??
            'gemini-3.1-flash-image-preview',
        },
        [
          {
            role: 'user',
            content: [
              `Generate an image with the following specifications:`,
              `- Prompt: ${options.prompt}`,
              `- Aspect ratio: ${options.aspectRatio}`,
            ].join('\n'),
          },
        ]
      )

      return {
        ok: true,
        data: extractImageBytes(result.choices[0].message.content),
        mimeType: 'image/png',
        durationMs: Date.now() - startedAt,
      }
    } catch (error) {
      if (error instanceof ImageApiError) {
        return {
          ok: false,
          errorCode:
            error.kind === 'timeout'
              ? 'timeout'
              : error.kind === 'misconfigured'
                ? 'misconfigured'
                : 'provider_error',
          message: error.message,
          status: error.status,
          durationMs: Date.now() - startedAt,
        }
      }

      return {
        ok: false,
        errorCode: 'provider_error',
        message: error instanceof Error ? error.message : 'Unknown provider failure',
        durationMs: Date.now() - startedAt,
      }
    }
  },
}
```

- [ ] **Step 4: Add the single-route SSE backend**

```ts
// app/api/generate/route.ts
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { parseGenerateRequest } from '@/lib/generation/request'
import { serializeSseEvent } from '@/lib/generation/sse'
import { getCanvasByIdAndUser } from '@/lib/db/canvas-queries'
import {
  createGenerationJobs,
  insertGeneratedImageResult,
  listRecentGenerationCountForUser,
  markGenerationJobCompleted,
  markGenerationJobFailed,
  recordGenerationUsage,
} from '@/lib/db/generation-queries'
import { getModelAdaptersForIds } from '@/lib/models/router'
import { uploadImage } from '@/lib/storage'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = (await request.json()) as Record<string, unknown>
  const parsed = parseGenerateRequest(raw)

  const canvas = await getCanvasByIdAndUser(session.user.id, parsed.canvasId)
  if (!canvas) {
    return NextResponse.json({ error: 'Canvas not found' }, { status: 404 })
  }

  const perMinuteCount = await listRecentGenerationCountForUser(session.user.id)
  if (perMinuteCount + parsed.modelIds.length > 60) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const groupId = randomUUID()
  const adapters = getModelAdaptersForIds(parsed.modelIds)
  const jobs = await createGenerationJobs({
    groupId,
    userId: session.user.id,
    canvasId: parsed.canvasId,
    prompt: parsed.prompt,
    aspectRatio: parsed.aspectRatio,
    quotaSource: 'platform',
    models: adapters.map((adapter) => ({
      modelId: adapter.definition.id,
      provider: adapter.definition.provider,
    })),
  })

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          serializeSseEvent('started', {
            groupId,
            jobs: jobs.map((job) => ({
              id: job.id,
              modelId: job.modelId,
              provider: job.provider,
            })),
          })
        )
      )

      await Promise.allSettled(
        adapters.map(async (adapter) => {
          const job = jobs.find((item) => item.modelId === adapter.definition.id)
          if (!job) return

          const result = await adapter.generate({
            prompt: parsed.prompt,
            aspectRatio: parsed.aspectRatio,
          })

          if (!result.ok) {
            await markGenerationJobFailed(job.id, {
              errorCode: result.errorCode,
              error: result.message,
              durationMs: result.durationMs,
            })

            controller.enqueue(
              new TextEncoder().encode(
                serializeSseEvent('job_failed', {
                  jobId: job.id,
                  modelId: adapter.definition.id,
                  errorCode: result.errorCode,
                  message: result.message,
                })
              )
            )
            return
          }

          const upload = await uploadImage(session.user.id, result.data)
          const image = await insertGeneratedImageResult({
            userId: session.user.id,
            canvasId: parsed.canvasId,
            groupId,
            model: adapter.definition.id,
            provider: adapter.definition.provider,
            prompt: parsed.prompt,
            aspectRatio: parsed.aspectRatio,
            blobUrl: upload.url,
            sizeBytes: upload.size,
            durationMs: result.durationMs,
          })

          await markGenerationJobCompleted(job.id, image.id, result.durationMs)
          await recordGenerationUsage({
            userId: session.user.id,
            action: 'generate',
            model: adapter.definition.id,
            provider: adapter.definition.provider,
            quotaSource: 'platform',
            groupId,
            durationMs: result.durationMs,
            canvasId: parsed.canvasId,
          })

          controller.enqueue(
            new TextEncoder().encode(
              serializeSseEvent('job_completed', {
                jobId: job.id,
                modelId: adapter.definition.id,
                imageId: image.id,
                blobUrl: image.blobUrl,
                durationMs: result.durationMs,
              })
            )
          )
        })
      )

      controller.enqueue(
        new TextEncoder().encode(serializeSseEvent('done', { groupId }))
      )
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 5: Verify the first streaming backend**

Run: `node --test lib/models/router.test.ts`

Expected: PASS

Run: `npm run lint`

Expected: PASS

Run: `npm run build`

Expected: PASS with `/api/generate` and `/api/canvas/save` compiling

- [ ] **Step 6: Commit the first backend slice**

```bash
git add lib/image-api.ts lib/storage.ts lib/models/gemini-flash.ts lib/models/router.ts lib/models/router.test.ts app/api/generate/route.ts
git commit -m "feat(generation): add streaming gemini backend"
```

## Task 4: Add The Canvas-Side Generation Panel, Placeholders, And Stream Listener

**Files:**
- Create: `components/canvas/generation-panel.tsx`
- Create: `components/canvas/generation-result-strip.tsx`
- Create: `hooks/use-canvas-generation-stream.ts`
- Create: `lib/canvas/generation-elements.ts`
- Create: `lib/canvas/generation-elements.test.ts`
- Modify: `components/canvas/canvas-workspace.tsx`
- Modify: `components/canvas/excalidraw-board.tsx`

- [ ] **Step 1: Write the failing pure test for placeholder geometry**

```ts
// lib/canvas/generation-elements.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error direct TS import for node --test in this repo
import {
  createGenerationPlaceholderElement,
  createGeneratedImageElement,
} from './generation-elements.ts'

test('builds a deterministic placeholder card per model', () => {
  const element = createGenerationPlaceholderElement({
    modelId: 'gemini-2.5-flash',
    index: 1,
  })

  assert.equal(element.type, 'rectangle')
  assert.equal(element.width > 0, true)
})

test('builds an image element for a completed generation result', () => {
  const element = createGeneratedImageElement({
    fileId: 'file-1',
    x: 320,
    y: 120,
    width: 1024,
    height: 1024,
  })

  assert.equal(element.type, 'image')
  assert.equal(element.fileId, 'file-1')
})
```

- [ ] **Step 2: Run the tests to confirm the module does not exist yet**

Run: `node --test lib/canvas/generation-elements.test.ts`

Expected: FAIL with missing module `./generation-elements.ts`

- [ ] **Step 3: Add the Excalidraw bridge and generation helpers**

```ts
// lib/canvas/generation-elements.ts
import { newElementWith } from '@excalidraw/excalidraw/element/newElement'

export function createGenerationPlaceholderElement({
  modelId,
  index,
}: {
  modelId: string
  index: number
}) {
  return newElementWith({
    type: 'rectangle',
    x: 320 * index,
    y: 96,
    width: 280,
    height: 280,
    backgroundColor: '#f3efe3',
    strokeColor: '#9a8f76',
    roundness: { type: 3 },
    boundElements: [],
    customData: { kind: 'generation-placeholder', modelId },
  })
}
```

```tsx
// components/canvas/excalidraw-board.tsx
export interface CanvasBoardHandle {
  insertGenerationPlaceholder(modelId: string): void
  replacePlaceholderWithImage(input: {
    modelId: string
    imageId: string
    blobUrl: string
    width: number
    height: number
  }): Promise<void>
}
```

```tsx
// components/canvas/canvas-workspace.tsx
<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
  <ExcalidrawBoard ref={boardRef} initialData={initialData} onSnapshotChange={queueSave} />
  <GenerationPanel
    canvasId={canvas.id}
    onStart={(modelIds) => modelIds.forEach((modelId) => boardRef.current?.insertGenerationPlaceholder(modelId))}
    onCompleted={(result) => boardRef.current?.replacePlaceholderWithImage(result)}
  />
</div>
```

- [ ] **Step 4: Implement the stream hook and panel UI**

```ts
// hooks/use-canvas-generation-stream.ts
export function useCanvasGenerationStream() {
  const [jobs, setJobs] = useState<GenerationClientJob[]>([])

  async function startGeneration(input: {
    canvasId: string
    prompt: string
    aspectRatio: string
    modelIds: string[]
    onStarted?: (modelIds: string[]) => void
    onCompleted?: (event: CompletedGenerationEvent) => void
  }) {
    input.onStarted?.(input.modelIds)

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok || !response.body) {
      throw new Error('Generation request failed')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() ?? ''

      for (const chunk of chunks) {
        // parse event/data lines, then update jobs and call onCompleted
      }
    }
  }

  return { jobs, startGeneration }
}
```

- [ ] **Step 5: Verify the canvas UI slice**

Run: `node --test lib/canvas/generation-elements.test.ts`

Expected: PASS

Run: `npm run lint`

Expected: PASS

Manual browser check:
1. Open `/canvas/<id>`
2. Enter a prompt, select Gemini, and click generate
3. Confirm a placeholder appears immediately on the board
4. Confirm the placeholder becomes an image when the `job_completed` event arrives
5. Refresh the page and confirm the image remains because it was persisted through autosave

- [ ] **Step 6: Commit the canvas client slice**

```bash
git add components/canvas/generation-panel.tsx components/canvas/generation-result-strip.tsx hooks/use-canvas-generation-stream.ts lib/canvas/generation-elements.ts lib/canvas/generation-elements.test.ts components/canvas/canvas-workspace.tsx components/canvas/excalidraw-board.tsx
git commit -m "feat(canvas): add streaming generation panel"
```

## Task 5: Add Seedream, Tongyi, And Finish P6B Verification

**Files:**
- Create: `lib/models/seedream.ts`
- Create: `lib/models/tongyi.ts`
- Modify: `lib/models/router.ts`
- Create: `docs/reviews/p6b-review-request.md`

- [ ] **Step 1: Add the provider adapters behind the existing router contract**

```ts
// lib/models/router.ts
import { geminiFlashAdapter } from './gemini-flash'
import { seedreamAdapter } from './seedream'
import { tongyiAdapter } from './tongyi'
import type { ModelAdapter, ModelId } from './types'

const ADAPTERS: Record<ModelId, ModelAdapter> = {
  'gemini-2.5-flash': geminiFlashAdapter,
  'seedream-5.0': seedreamAdapter,
  'tongyi-wanx2.1': tongyiAdapter,
}

export function getModelAdaptersForIds(modelIds: ModelId[]): ModelAdapter[] {
  return modelIds.map((modelId) => ADAPTERS[modelId])
}
```

- [ ] **Step 2: Run the full P6B verification set**

Run: `node --test lib/models/registry.test.ts lib/generation/request.test.ts lib/generation/sse.test.ts lib/models/router.test.ts lib/canvas/generation-elements.test.ts`

Expected: PASS

Run: `npm run lint`

Expected: PASS

Run: `npm run build`

Expected: PASS

Browser verification:
1. Generate one image with Gemini on `/canvas/<id>`
2. Generate the same prompt with Gemini + Seedream + Tongyi
3. Confirm placeholders are immediate, and completed cards show model-specific labels
4. Refresh and confirm completed jobs remain on the canvas
5. Hard refresh during a running request, then reload and confirm orphan recovery repopulates completed jobs

- [ ] **Step 3: Write the P6B Claude review handoff**

```md
# P6B Review Request

## Scope
- Multi-model contracts and model whitelist
- `generationJobs` persistence and platform-only quota accounting
- `/api/generate` SSE route
- Gemini / Seedream / Tongyi adapters
- Canvas generation panel, placeholders, and orphan recovery

## Verification Already Run
- `node --test lib/models/registry.test.ts lib/generation/request.test.ts lib/generation/sse.test.ts lib/models/router.test.ts lib/canvas/generation-elements.test.ts`
- `npm run lint`
- `npm run build`
- Browser checks covering single-model, multi-model, refresh, and orphan recovery

## Review Focus
- Auth / ownership on `canvasId` and job recovery queries
- SSRF whitelist enforcement
- Rate limit and platform-only quota correctness
- SSE event parsing and disconnect safety
- Excalidraw insertion / replacement correctness
```

- [ ] **Step 4: Commit the completed stage**

```bash
git add lib/models/seedream.ts lib/models/tongyi.ts lib/models/router.ts docs/reviews/p6b-review-request.md
git commit -m "feat(generation): add multi-model canvas generation"
```

---

## P6B Notes Before Coding

- `useCanvasAutosave` now takes `(canvasId, initialSerialized)` only. Do not reintroduce the old `initialState` parameter.
- `saveCanvasStateAction` now accepts `state: unknown`, and the server owns `parseCanvasState()` validation.
- `beforeunload` already tries to call `/api/canvas/save`; this route should land early in P6B so the keepalive path is real before more generation traffic reaches the canvas page.
- Keep `app/actions/generate.ts` and `app/actions/edit.ts` untouched in P6B. They remain the legacy single-image flow for `/generate` and `/edit`.
- Keep `userApiKeys` out of this plan on purpose. That lands in P6C after the streaming generation path is stable.
