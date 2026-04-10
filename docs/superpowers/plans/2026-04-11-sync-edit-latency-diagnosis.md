# Sync Edit Latency Diagnosis v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land all four diagnostic instrumentation artifacts (Phase 1 / 2B / 2C / 3) specified in `docs/superpowers/specs/2026-04-11-sync-edit-latency-diagnosis-design.md`, gated behind `DEBUG_SECRET`, so the user can run experiments in production and definitively attribute the `editImageAction` 504 timeout to one of the four candidate root causes.

**Architecture:** One shared helper module (`lib/debug-diagnosis.ts`) provides pure-function auth / URL / param validation so the three debug routes stay thin and the helpers are unit-testable with `node:test`. `lib/image-api.ts` gains an opts-based instrumentation path for `editImage()` only (generate untouched). A zero-dependency local Node script (`scripts/bench-147ai.mjs`) performs the off-Vercel direct-call bench.

**Tech Stack:** Next.js 16 App Router, Node 20 runtime, `node:test` + `node:assert/strict`, `NextResponse`, Vercel Blob (fixture only).

**Working branch:** `master` — per user's established workflow on this repo, commits land directly on master. Every commit in this plan must contain a `// TEMP-DIAGNOSIS:` marker comment in any new/modified code line so the teardown grep (`rg -n "TEMP-DIAGNOSIS" app lib scripts`) finds it.

---

## File Structure

**New files (all TEMP-DIAGNOSIS, removed at teardown):**

- `lib/debug-diagnosis.ts` — pure-function helpers: `validateDebugAuth`, `parseSleepSeconds`, `validateBlobUrl`. No Next.js imports. No side effects.
- `lib/debug-diagnosis.test.ts` — unit tests for the three helpers.
- `lib/image-api.test.ts` — tests for the new `editImage()` `opts` parameter (traceId default + `timingOut` population). Uses `node:test` mock on `globalThis.fetch`.
- `app/api/debug/sleep60/route.ts` — Phase 3 sleep route, `maxDuration = 60`.
- `app/api/debug/sleep300/route.ts` — Phase 3 sleep route, `maxDuration = 300`.
- `app/api/debug/edit-bench/route.ts` — Phase 2B isolated bench route, `maxDuration = 60`, exactly one `editImage` call per request.
- `scripts/bench-147ai.mjs` — Phase 2C local Node script.

**Modified files:**

- `lib/image-api.ts` — `editImage()` gains `opts?: { traceId?: string; timingOut?: Record<string, number> }` and inlines the fetch with six E0–E6 timing points. `generateImage()` is **unchanged**. All additions wrapped in `// TEMP-DIAGNOSIS` comments.
- `.env.local.example` — add `DEBUG_SECRET` and `DEBUG_BENCH_IMAGE_URL` placeholders with generation instructions.

**Non-code user-side deliverables (outside the scope of these tasks but part of the rollout):**

- Upload the same ~1.1 MB fish-tank fixture that has been failing to Vercel Blob and record the public URL.
- Set `DEBUG_SECRET` + `DEBUG_BENCH_IMAGE_URL` in Vercel env vars and local `.env.local`.
- Run experiments and fill the Decision Matrix in the spec.
- After remedy is chosen, execute the teardown commit (see "Post-Execution" at the end of this plan).

---

## Task 0: Preflight — verify branch state, spec presence, and test runner

**Files:** none created or modified.

- [ ] **Step 1: Confirm working state**

Run: `git status --short`
Expected output must show no modifications to any of the files this plan will touch: `lib/image-api.ts`, `lib/debug-diagnosis.ts` (does not exist yet), `lib/debug-diagnosis.test.ts` (does not exist yet), `lib/image-api.test.ts` (does not exist yet), `app/api/debug/` (does not exist yet), `scripts/bench-147ai.mjs` (does not exist yet), `.env.local.example`. If any of these files are dirty, STOP and ask the controller.

- [ ] **Step 2: Confirm spec file exists**

Run: `ls docs/superpowers/specs/2026-04-11-sync-edit-latency-diagnosis-design.md`
Expected: the file exists.

- [ ] **Step 3: Confirm the test runner command works on an existing test**

Run: `node --test --experimental-strip-types lib/i18n.test.ts`
Expected: `# pass 2` (or similar — any nonzero pass count with `# fail 0`). If this fails, STOP — the repo's test setup is broken and fixing it is out of scope for this plan.

- [ ] **Step 4: Confirm current branch**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `master`. If not master, STOP and ask the controller — the plan assumes master.

No commit for Task 0. If all four checks pass, proceed to Task 1.

---

## Task 1: `lib/debug-diagnosis.ts` helpers + tests

**Files:**
- Create: `lib/debug-diagnosis.ts`
- Create: `lib/debug-diagnosis.test.ts`

**Purpose:** Centralise the three shared pure functions so the downstream route tasks stay thin and everything is unit-testable without spinning up Next.js. Every function in this file is TEMP-DIAGNOSIS and the whole file will be deleted at teardown.

- [ ] **Step 1: Write the failing test**

Create `lib/debug-diagnosis.test.ts`:

```typescript
// TEMP-DIAGNOSIS: delete at teardown together with debug-diagnosis.ts
import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
import {
  validateDebugAuth,
  parseSleepSeconds,
  validateBlobUrl,
} from './debug-diagnosis.ts'

test('validateDebugAuth returns 503 when secret env var is missing', () => {
  assert.deepEqual(
    validateDebugAuth('Bearer anything', undefined),
    { ok: false, status: 503 }
  )
  assert.deepEqual(
    validateDebugAuth('Bearer anything', ''),
    { ok: false, status: 503 }
  )
})

test('validateDebugAuth returns 401 when header does not match', () => {
  assert.deepEqual(
    validateDebugAuth(null, 'the-secret'),
    { ok: false, status: 401 }
  )
  assert.deepEqual(
    validateDebugAuth('Bearer wrong', 'the-secret'),
    { ok: false, status: 401 }
  )
  assert.deepEqual(
    validateDebugAuth('the-secret', 'the-secret'),
    { ok: false, status: 401 }
  )
})

test('validateDebugAuth returns ok on exact bearer match', () => {
  assert.deepEqual(
    validateDebugAuth('Bearer the-secret', 'the-secret'),
    { ok: true }
  )
})

test('parseSleepSeconds defaults to 75 when param is missing', () => {
  assert.equal(parseSleepSeconds(null), 75)
})

test('parseSleepSeconds clamps to [1, 180]', () => {
  assert.equal(parseSleepSeconds('0'), 1)
  assert.equal(parseSleepSeconds('-5'), 1)
  assert.equal(parseSleepSeconds('200'), 180)
  assert.equal(parseSleepSeconds('180'), 180)
  assert.equal(parseSleepSeconds('1'), 1)
  assert.equal(parseSleepSeconds('75'), 75)
})

test('parseSleepSeconds falls back to 1 on non-numeric input', () => {
  assert.equal(parseSleepSeconds('hello'), 1)
  assert.equal(parseSleepSeconds(''), 1)
})

test('validateBlobUrl accepts https vercel blob URLs', () => {
  assert.equal(
    validateBlobUrl('https://abc123.public.blob.vercel-storage.com/fixture.jpg').ok,
    true
  )
})

test('validateBlobUrl rejects non-https', () => {
  assert.equal(
    validateBlobUrl('http://abc123.public.blob.vercel-storage.com/fixture.jpg').ok,
    false
  )
})

test('validateBlobUrl rejects non-vercel-blob hostnames', () => {
  assert.equal(
    validateBlobUrl('https://evil.example.com/fixture.jpg').ok,
    false
  )
  assert.equal(
    validateBlobUrl('https://public.blob.vercel-storage.com.evil.com/a').ok,
    false
  )
})

test('validateBlobUrl rejects unparseable URLs', () => {
  assert.equal(validateBlobUrl('not a url').ok, false)
  assert.equal(validateBlobUrl('').ok, false)
  assert.equal(validateBlobUrl(undefined).ok, false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types lib/debug-diagnosis.test.ts`
Expected: FAIL with `Cannot find module './debug-diagnosis.ts'` or equivalent.

- [ ] **Step 3: Write minimal implementation**

Create `lib/debug-diagnosis.ts`:

```typescript
// TEMP-DIAGNOSIS: pure helpers shared by app/api/debug/*. Delete at teardown.
// Intentionally zero imports — keeps the module trivially testable with
// `node --test --experimental-strip-types`.

export type AuthResult =
  | { ok: true }
  | { ok: false; status: 503 | 401 }

/**
 * Returns `{ ok: true }` only when the env secret is set AND the incoming
 * Authorization header exactly matches `Bearer <secret>`.
 *
 * Priority: env-missing (503) wins over header-mismatch (401). Chosen so the
 * route can cheaply refuse when diagnosis isn't configured without leaking
 * the existence of the endpoint to unauthenticated probers.
 */
export function validateDebugAuth(
  authHeader: string | null,
  secretFromEnv: string | undefined
): AuthResult {
  if (!secretFromEnv) {
    return { ok: false, status: 503 }
  }
  if (authHeader !== `Bearer ${secretFromEnv}`) {
    return { ok: false, status: 401 }
  }
  return { ok: true }
}

/**
 * Parses and clamps the `?seconds=N` query param for the sleep routes.
 * Default 75, clamped to [1, 180]. Non-numeric / missing / out-of-range
 * inputs all resolve to a safe value inside the range — the sleep routes
 * never trust the caller to send something sane.
 */
export function parseSleepSeconds(raw: string | null): number {
  if (raw === null) {
    // Spec default when ?seconds is omitted entirely (URLSearchParams.get
    // returns null). An explicit `?seconds=` (empty value) is treated as
    // non-numeric input and clamps to 1 via the parseInt branch below.
    return 75
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }
  if (parsed > 180) {
    return 180
  }
  return parsed
}

export type BlobUrlValidation =
  | { ok: true; url: URL }
  | { ok: false; reason: string }

/**
 * Validates that a string env value points to a Vercel Blob public URL.
 * Used by the edit-bench route to refuse arbitrary hostnames — the route
 * runs in production and is authenticated only by DEBUG_SECRET, so
 * hostname allowlisting closes the SSRF surface if the secret ever leaks.
 */
export function validateBlobUrl(raw: string | undefined): BlobUrlValidation {
  if (!raw) {
    return { ok: false, reason: 'empty' }
  }
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, reason: 'unparseable' }
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'not-https' }
  }
  // Must end with the Vercel Blob public domain. The trailing-dot check
  // prevents 'public.blob.vercel-storage.com.evil.com' from slipping through
  // a naive `.endsWith` check — we require a real subdomain delimiter.
  const host = parsed.hostname
  if (!host.endsWith('.public.blob.vercel-storage.com')) {
    return { ok: false, reason: 'wrong-host' }
  }
  return { ok: true, url: parsed }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --experimental-strip-types lib/debug-diagnosis.test.ts`
Expected: `# pass 10` (10 `test(...)` calls), `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/debug-diagnosis.ts lib/debug-diagnosis.test.ts
git commit -m "test(debug-diagnosis): add pure helpers for debug routes (TEMP-DIAGNOSIS)

Part of the 2026-04-11 sync edit latency diagnosis. Three helpers
centralise the shared behaviour of the three debug routes:
- validateDebugAuth (bearer check, 503 when env unset)
- parseSleepSeconds (clamps to [1, 180])
- validateBlobUrl (SSRF guard for edit-bench fixture fetch)

Pure functions, no imports, node:test-covered. Whole file deletes
at diagnosis teardown."
```

---

## Task 2: `lib/image-api.ts` Phase 1 instrumentation + tests

**Files:**
- Modify: `lib/image-api.ts` (`editImage()` only; `generateImage()` and `callApi()` untouched)
- Create: `lib/image-api.test.ts`

**Purpose:** Emit E0–E6 timing points for `editImage()` so Phase 1 can pinpoint where inside the fetch the hang occurs. The function also gains two optional params (`traceId`, `timingOut`) so Phase 2B can extract structured timing without parsing log lines.

**Why inline the fetch instead of reusing `callApi()`:** `callApi()` is shared with `generateImage()`. We explicitly do not want to instrument generate (see spec: "generateImage() is explicitly out of scope"). Inlining the fetch into the instrumented `editImage()` keeps the diagnostic blast radius confined to one function. Teardown reverts this function verbatim.

- [ ] **Step 1: Write the failing test**

Create `lib/image-api.test.ts`:

```typescript
// TEMP-DIAGNOSIS: delete at teardown (covers instrumentation-only behaviour).
import test, { mock } from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
import { editImage } from './image-api.ts'

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
  process.env.IMAGE_API_KEY = 'test-key'
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
  // Every later phase is >= e0 (monotonic, relative to t0).
  assert.ok(timingOut.e6 >= timingOut.e5)
  assert.ok(timingOut.e5 >= timingOut.e4)
  assert.ok(timingOut.e4 >= timingOut.e3)
  assert.ok(timingOut.e3 >= timingOut.e2)
  assert.ok(timingOut.e2 >= timingOut.e1)

  mock.restoreAll()
})

test('editImage generates a default traceId when opts omitted', async () => {
  process.env.IMAGE_API_KEY = 'test-key'
  installFetchMock()

  // No opts at all — existing callers compile unchanged.
  const result = await editImage('test', [Buffer.from('x')])
  assert.ok(Buffer.isBuffer(result))

  mock.restoreAll()
})

test('editImage still works when only traceId is passed (no timingOut)', async () => {
  process.env.IMAGE_API_KEY = 'test-key'
  installFetchMock()

  const result = await editImage('test', [Buffer.from('x')], { traceId: 'abcd1234' })
  assert.ok(Buffer.isBuffer(result))

  mock.restoreAll()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --experimental-strip-types lib/image-api.test.ts`
Expected: FAIL. The current `editImage()` signature is `(prompt, imageBuffers)` — passing a third opts argument is silently ignored so `timingOut` stays empty, and the first test's `timingOut.e0` assertion fails with `expected number, got undefined`.

- [ ] **Step 3: Write the instrumented `editImage()`**

Edit `lib/image-api.ts`. Keep all existing code untouched except `editImage()`. Add one import at the top of the file:

```typescript
// TEMP-DIAGNOSIS: randomUUID used for default traceId generation. Remove at teardown.
import { randomUUID } from 'node:crypto'
```

Then replace the entire existing `editImage()` function (lines 88–109 in the current file) with this instrumented version:

```typescript
// TEMP-DIAGNOSIS: editImage() is instrumented with E0..E6 timing points.
// Inlined the fetch (rather than reusing callApi()) so generateImage() stays
// completely untouched. Revert this function to its pre-diagnosis form at
// teardown — the source of truth is whatever commit sits immediately before
// this task's commit on the current branch.
export async function editImage(
  prompt: string,
  imageBuffers: Buffer[],
  opts?: { traceId?: string; timingOut?: Record<string, number> } // TEMP-DIAGNOSIS
): Promise<Buffer> {
  // TEMP-DIAGNOSIS: E0 invoked
  const traceId = opts?.traceId ?? randomUUID().slice(0, 8)
  const timingOut = opts?.timingOut
  const t0 = Date.now()
  const totalInputBytes = imageBuffers.reduce((s, b) => s + b.length, 0)
  console.error(
    `[bench-phase1] ${traceId} E0 invoked prompt.length=${prompt.length} buffers=${imageBuffers.length} totalBytes=${totalInputBytes}`
  )
  if (timingOut) timingOut.e0 = 0

  // TEMP-DIAGNOSIS: E1 encode start
  const t1 = Date.now()
  console.error(`[bench-phase1] ${traceId} E1 encode start`)
  if (timingOut) timingOut.e1 = t1 - t0

  const imageContents = imageBuffers.map((buf) => ({
    type: 'image_url' as const,
    image_url: { url: `data:image/png;base64,${buf.toString('base64')}` },
  }))

  // TEMP-DIAGNOSIS: E2 encode done
  const t2 = Date.now()
  const base64Length = imageContents.reduce((s, c) => s + c.image_url.url.length, 0)
  console.error(
    `[bench-phase1] ${traceId} E2 encode done +${t2 - t1}ms base64Length=${base64Length}`
  )
  if (timingOut) timingOut.e2 = t2 - t0

  const messages: ApiMessage[] = [
    {
      role: 'user',
      content: [
        ...imageContents,
        { type: 'text' as const, text: `Edit this image: ${prompt}` },
      ],
    },
  ]

  if (!API_KEY) {
    throw new Error('IMAGE_API_KEY environment variable is not set')
  }

  // TEMP-DIAGNOSIS: E3 fetch start
  const t3 = Date.now()
  const apiHost = new URL(API_URL).host
  console.error(
    `[bench-phase1] ${traceId} E3 fetch start host=${apiHost} model=${MODEL}`
  )
  if (timingOut) timingOut.e3 = t3 - t0

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 8192,
      }),
      signal: controller.signal,
    })

    // TEMP-DIAGNOSIS: E4 headers received
    const t4 = Date.now()
    console.error(
      `[bench-phase1] ${traceId} E4 headers received status=${response.status} +${t4 - t3}ms`
    )
    if (timingOut) timingOut.e4 = t4 - t0

    if (!response.ok) {
      await response.text() // consume body
      throw new Error(`Image generation failed (status ${response.status})`)
    }

    const data = (await response.json()) as ApiResponse

    // TEMP-DIAGNOSIS: E5 body parsed
    const t5 = Date.now()
    const payloadBytes = JSON.stringify(data).length
    console.error(
      `[bench-phase1] ${traceId} E5 body parsed +${t5 - t4}ms payloadBytes=${payloadBytes}`
    )
    if (timingOut) timingOut.e5 = t5 - t0

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('API response missing expected content structure')
    }

    const buffer = extractImageBuffer(data.choices[0].message.content)

    // TEMP-DIAGNOSIS: E6 buffer extracted
    const t6 = Date.now()
    console.error(
      `[bench-phase1] ${traceId} E6 buffer extracted +${t6 - t5}ms resultBytes=${buffer.length} total=${t6 - t0}ms`
    )
    if (timingOut) timingOut.e6 = t6 - t0

    return buffer
  } finally {
    clearTimeout(timeoutId)
  }
}
```

**Do not change** `generateImage()`, `callApi()`, `extractImageBuffer()`, or the module-level constants.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test --experimental-strip-types lib/image-api.test.ts`
Expected: `# pass 3`, `# fail 0`. All three tests green. Note: you will also see `[bench-phase1] ...` log lines written to stderr by the instrumentation — that is expected.

- [ ] **Step 5: Verify existing callers still compile**

Run: `npx tsc --noEmit`
Expected: no errors. `editImageAction` (in `app/actions/edit.ts`) calls `editImage(prompt, imageBuffers)` with two args. Because `opts` is optional, the existing call site compiles unchanged.

- [ ] **Step 6: Commit**

```bash
git add lib/image-api.ts lib/image-api.test.ts
git commit -m "feat(image-api): add E0-E6 timing + opts param to editImage (TEMP-DIAGNOSIS)

Phase 1 of 2026-04-11 sync edit latency diagnosis. editImage()
now optionally accepts { traceId?, timingOut? } and emits six
timing points around the inline fetch so Phase 1 can attribute
the hang to encode / fetch-start / headers / body / extract.

generateImage() and callApi() are intentionally untouched — the
reproducing failure is edit-only and we want the smallest
diagnostic blast radius.

Existing callers compile unchanged (opts is optional). Whole
function reverts to its pre-diagnosis form at teardown."
```

---

## Task 3: `app/api/debug/sleep60/route.ts`

**Files:**
- Create: `app/api/debug/sleep60/route.ts`

**Purpose:** Phase 3 route used to verify whether Vercel enforces the 60 s cap when `maxDuration = 60` is declared. Expected behaviour: `?seconds=75` is killed around the 60 s mark with 504. Uses `lib/debug-diagnosis.ts` for auth and param parsing, so the route itself is trivial glue and does not need its own unit tests.

- [ ] **Step 1: Create the route file**

Create `app/api/debug/sleep60/route.ts`:

```typescript
// TEMP-DIAGNOSIS: Phase 3 — verify the 60s function cap. Delete at teardown.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateDebugAuth, parseSleepSeconds } from '@/lib/debug-diagnosis'

// Declared maxDuration for this route. Phase 3's whole point is to see
// whether this declaration actually controls the cap.
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = validateDebugAuth(
    req.headers.get('authorization'),
    process.env.DEBUG_SECRET
  )
  if (!auth.ok) {
    if (auth.status === 503) {
      // Empty body — don't fingerprint the route for unauthenticated probers.
      return new NextResponse(null, { status: 503 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const seconds = parseSleepSeconds(url.searchParams.get('seconds'))

  const start = Date.now()
  await new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000))
  const actualMs = Date.now() - start

  return NextResponse.json({
    requested: seconds,
    actualMs,
    maxDurationDeclared: 60,
  })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint app/api/debug/sleep60/route.ts`
Expected: no errors (warnings about `console.error` would be unexpected — this file does not log).

- [ ] **Step 4: Smoke-test the route file is picked up by Next.js**

Run: `npx next build 2>&1 | grep "api/debug/sleep60"` (if the build is slow, it is acceptable to skip this step and rely on the final Task 8 build — but this step catches regressions earlier).
Expected: a line mentioning the new route appears in the build output, confirming Next.js recognises it.

- [ ] **Step 5: Commit**

```bash
git add app/api/debug/sleep60/route.ts
git commit -m "feat(debug): add /api/debug/sleep60 route (TEMP-DIAGNOSIS)

Phase 3 verification route: declares maxDuration=60 and sleeps
for ?seconds=N (default 75). Used to prove that Vercel kills the
invocation at ~60s when maxDuration=60 is declared. Guarded by
DEBUG_SECRET bearer auth — 503 when env unset, 401 on mismatch.
Deletes at diagnosis teardown."
```

---

## Task 4: `app/api/debug/sleep300/route.ts`

**Files:**
- Create: `app/api/debug/sleep300/route.ts`

**Purpose:** Same as Task 3 but with `maxDuration = 300`. Delta experiment: if Hobby honours the declaration, `?seconds=75` completes in 75 s; if Hobby caps regardless, it dies at 60 s. This is the only way to distinguish "60 s cap is self-imposed via our code" from "60 s cap is plan-wide platform enforcement."

- [ ] **Step 1: Create the route file**

Create `app/api/debug/sleep300/route.ts`:

```typescript
// TEMP-DIAGNOSIS: Phase 3 — test whether maxDuration>60 is honored. Delete at teardown.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateDebugAuth, parseSleepSeconds } from '@/lib/debug-diagnosis'

// Declared 300 specifically to see whether Hobby enforces it.
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = validateDebugAuth(
    req.headers.get('authorization'),
    process.env.DEBUG_SECRET
  )
  if (!auth.ok) {
    if (auth.status === 503) {
      return new NextResponse(null, { status: 503 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const seconds = parseSleepSeconds(url.searchParams.get('seconds'))

  const start = Date.now()
  await new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000))
  const actualMs = Date.now() - start

  return NextResponse.json({
    requested: seconds,
    actualMs,
    maxDurationDeclared: 300,
  })
}
```

The only differences from sleep60 are: the TEMP-DIAGNOSIS comment, `export const maxDuration = 300`, and `maxDurationDeclared: 300` in the response. Do not DRY these into a shared factory — the two routes must be independently deployable files and teardown needs to remove them by path.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint app/api/debug/sleep300/route.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/debug/sleep300/route.ts
git commit -m "feat(debug): add /api/debug/sleep300 route (TEMP-DIAGNOSIS)

Phase 3 companion route to sleep60. Declares maxDuration=300 so
that ?seconds=75 can reveal whether Hobby actually honors
maxDuration>60 or silently caps at 60. This distinction drives
remedy direction: honored -> raise maxDuration on edit/generate
pages; capped -> maxDuration is a dead lever. Deletes at teardown."
```

---

## Task 5: `app/api/debug/edit-bench/route.ts`

**Files:**
- Create: `app/api/debug/edit-bench/route.ts`

**Purpose:** Phase 2B isolated bench route. Fetches the fixture from Vercel Blob, calls `editImage()` exactly once with instrumentation, returns the timing breakdown as JSON. No auth / quota / DB / blob upload / magic-byte path — those all run before `editImage()` in the real action and their cost cannot retroactively extend E3→E4, so skipping them isolates `editImage()`'s contribution cleanly.

**Critical constraints** (from the spec):

- Exactly one `editImage()` call per request. No loop. No `samples` parameter. (Two ~30 s samples in one invocation would exceed the 60 s cap and be misattributed.)
- `fixtureBytes` and `fixtureFetchMs` are load-bearing — always emit them, even when the sample fails.
- `DEBUG_BENCH_IMAGE_URL` must be validated through `validateBlobUrl()` before the fetch.

- [ ] **Step 1: Create the route file**

Create `app/api/debug/edit-bench/route.ts`:

```typescript
// TEMP-DIAGNOSIS: Phase 2B isolated bench route. Delete at teardown.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { validateDebugAuth, validateBlobUrl } from '@/lib/debug-diagnosis'
import { editImage } from '@/lib/image-api'

// Matches the real edit page's declared cap so the bench runs under
// identical Vercel limits.
export const maxDuration = 60

interface BenchRequestBody {
  prompt?: unknown
}

interface BenchSample {
  traceId: string
  totalMs: number
  e0ToE2Ms: number
  e2ToE3Ms: number
  e3ToE4Ms: number
  e4ToE5Ms: number
  e5ToE6Ms: number
}

interface BenchResponse {
  fixtureBytes: number | null
  fixtureFetchMs: number | null
  sample: BenchSample | null
  error?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const auth = validateDebugAuth(
    req.headers.get('authorization'),
    process.env.DEBUG_SECRET
  )
  if (!auth.ok) {
    if (auth.status === 503) {
      return new NextResponse(null, { status: 503 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate DEBUG_BENCH_IMAGE_URL (SSRF guard)
  const urlCheck = validateBlobUrl(process.env.DEBUG_BENCH_IMAGE_URL)
  if (!urlCheck.ok) {
    return NextResponse.json(
      { error: `DEBUG_BENCH_IMAGE_URL invalid: ${urlCheck.reason}` },
      { status: 500 }
    )
  }

  // 3. Parse request body (prompt only — no samples param, one call per request)
  let body: BenchRequestBody
  try {
    body = (await req.json()) as BenchRequestBody
  } catch {
    return NextResponse.json(
      { error: 'Request body must be JSON' },
      { status: 400 }
    )
  }
  if (typeof body.prompt !== 'string' || body.prompt.trim() === '') {
    return NextResponse.json(
      { error: 'prompt (non-empty string) is required' },
      { status: 400 }
    )
  }
  const prompt = body.prompt

  // 4. Fetch fixture bytes from Vercel Blob (explicitly timed)
  const fixtureFetchStart = Date.now()
  let fixtureBuffer: Buffer
  let fixtureBytes: number
  let fixtureFetchMs: number
  try {
    const fixtureResp = await fetch(urlCheck.url.toString())
    if (!fixtureResp.ok) {
      return NextResponse.json(
        {
          fixtureBytes: null,
          fixtureFetchMs: Date.now() - fixtureFetchStart,
          sample: null,
          error: `Fixture fetch failed with status ${fixtureResp.status}`,
        } satisfies BenchResponse,
        { status: 502 }
      )
    }
    const arrayBuf = await fixtureResp.arrayBuffer()
    fixtureBuffer = Buffer.from(arrayBuf)
    fixtureBytes = fixtureBuffer.length
    fixtureFetchMs = Date.now() - fixtureFetchStart
  } catch (err) {
    return NextResponse.json(
      {
        fixtureBytes: null,
        fixtureFetchMs: Date.now() - fixtureFetchStart,
        sample: null,
        error: `Fixture fetch threw: ${err instanceof Error ? err.message : String(err)}`,
      } satisfies BenchResponse,
      { status: 502 }
    )
  }

  // 5. Run exactly one editImage call with timing captured into timingOut.
  const traceId = randomUUID().slice(0, 8)
  const timingOut: Record<string, number> = {}
  const wallStart = Date.now()
  try {
    await editImage(prompt, [fixtureBuffer], { traceId, timingOut })
  } catch (err) {
    // Report partial timing — fixtureBytes and fixtureFetchMs always present.
    return NextResponse.json(
      {
        fixtureBytes,
        fixtureFetchMs,
        sample: null,
        error: `editImage threw: ${err instanceof Error ? err.message : String(err)}`,
      } satisfies BenchResponse,
      { status: 500 }
    )
  }
  const totalMs = Date.now() - wallStart

  // 6. Compute delta windows from the cumulative-from-t0 timingOut map.
  const sample: BenchSample = {
    traceId,
    totalMs,
    e0ToE2Ms: (timingOut.e2 ?? 0) - (timingOut.e0 ?? 0),
    e2ToE3Ms: (timingOut.e3 ?? 0) - (timingOut.e2 ?? 0),
    e3ToE4Ms: (timingOut.e4 ?? 0) - (timingOut.e3 ?? 0),
    e4ToE5Ms: (timingOut.e5 ?? 0) - (timingOut.e4 ?? 0),
    e5ToE6Ms: (timingOut.e6 ?? 0) - (timingOut.e5 ?? 0),
  }

  return NextResponse.json(
    { fixtureBytes, fixtureFetchMs, sample } satisfies BenchResponse
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint app/api/debug/edit-bench/route.ts`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/debug/edit-bench/route.ts
git commit -m "feat(debug): add /api/debug/edit-bench route (TEMP-DIAGNOSIS)

Phase 2B isolated bench: DEBUG_SECRET auth, SSRF-hardened fixture
fetch from Vercel Blob, exactly one editImage call per request
(no samples loop — would overflow 60s cap). Response always
includes fixtureBytes and fixtureFetchMs so Blob pull time is not
misattributed to editImage latency. Deletes at diagnosis teardown."
```

---

## Task 6: `scripts/bench-147ai.mjs` local bench script

**Files:**
- Create: `scripts/bench-147ai.mjs`

**Purpose:** Phase 2C — run the same `editImage`-shaped fetch from the user's Windows machine so local distribution can be compared against Vercel distribution. If local is tight and Vercel is wide, the problem is in the Vercel → 147ai path, not in 147ai itself. Zero external dependencies (just Node built-ins) so it is trivially runnable and trivially deletable.

**Note on omitted metrics:** Node's built-in fetch does not expose DNS / TLS / socket-open phases without a custom Dispatcher, so this script only measures `headersMs`, `bodyMs`, `totalMs`. See the spec for the rationale.

- [ ] **Step 1: Create the script**

Create `scripts/bench-147ai.mjs`:

```javascript
#!/usr/bin/env node
// TEMP-DIAGNOSIS: Phase 2C local bench. Delete at teardown (or move to
// scripts/archive/ if kept as a regression tool).
//
// Invocation:
//   node scripts/bench-147ai.mjs <image-path> "<prompt>" [samples]
//
// Reads IMAGE_API_KEY, IMAGE_API_URL, IMAGE_MODEL from .env.local with a
// tiny manual parser — no dotenv dependency. Runs `samples` sequential
// fetch calls to 147ai, times each, prints a min/p50/p95/max summary.

import { readFileSync, statSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import path from 'node:path'

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  let raw
  try {
    raw = readFileSync(envPath, 'utf8')
  } catch {
    console.error(`could not read ${envPath}`)
    process.exit(1)
  }
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    // Strip matching surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function quantile(sortedNums, q) {
  if (sortedNums.length === 0) return NaN
  const idx = Math.min(sortedNums.length - 1, Math.floor((sortedNums.length - 1) * q))
  return sortedNums[idx]
}

function fmt(n) {
  return Number.isFinite(n) ? String(Math.round(n)).padStart(6) : '   N/A'
}

async function main() {
  const [, , imagePath, prompt, samplesArg] = process.argv
  if (!imagePath || !prompt) {
    console.error('usage: node scripts/bench-147ai.mjs <image-path> "<prompt>" [samples]')
    process.exit(1)
  }
  const samples = samplesArg ? Number.parseInt(samplesArg, 10) : 5
  if (!Number.isFinite(samples) || samples < 1 || samples > 50) {
    console.error('samples must be a positive integer <= 50')
    process.exit(1)
  }

  const env = loadEnvLocal()
  const apiKey = env.IMAGE_API_KEY
  const apiUrl = env.IMAGE_API_URL || 'https://147ai.com/v1/chat/completions'
  const model = env.IMAGE_MODEL || 'gemini-3.1-flash-image-preview'
  if (!apiKey) {
    console.error('IMAGE_API_KEY missing from .env.local')
    process.exit(1)
  }

  const absImagePath = path.resolve(process.cwd(), imagePath)
  const fileBytes = statSync(absImagePath).size
  const buf = readFileSync(absImagePath)
  // Encode once outside the loop — encoding cost is not under test here.
  const base64 = buf.toString('base64')
  const dataUrl = `data:image/png;base64,${base64}`

  console.log('')
  console.log(`samples:  ${samples}`)
  console.log(`image:    ${imagePath} (${(fileBytes / (1024 * 1024)).toFixed(2)} MB)`)
  console.log(`prompt:   ${JSON.stringify(prompt)}`)
  console.log(`endpoint: ${new URL(apiUrl).host}`)
  console.log(`model:    ${model}`)
  console.log('')

  const headersMs = []
  const bodyMs = []
  const totalMs = []
  const failures = []

  for (let i = 0; i < samples; i += 1) {
    const body = JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: `Edit this image: ${prompt}` },
          ],
        },
      ],
      max_tokens: 8192,
    })

    const t0 = performance.now()
    let t1 = NaN
    let t2 = NaN
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
      })
      t1 = performance.now()
      // Drain the body so bodyMs reflects the full read.
      await resp.text()
      t2 = performance.now()
      if (!resp.ok) {
        failures.push(`sample ${i + 1}: status ${resp.status}`)
        continue
      }
    } catch (err) {
      failures.push(`sample ${i + 1}: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }

    headersMs.push(t1 - t0)
    bodyMs.push(t2 - t1)
    totalMs.push(t2 - t0)
    console.log(
      `sample ${String(i + 1).padStart(2)}: headers=${fmt(t1 - t0)}ms  body=${fmt(t2 - t1)}ms  total=${fmt(t2 - t0)}ms`
    )
  }

  const sortedH = [...headersMs].sort((a, b) => a - b)
  const sortedB = [...bodyMs].sort((a, b) => a - b)
  const sortedT = [...totalMs].sort((a, b) => a - b)

  console.log('')
  console.log(`                 min      p50      p95      max`)
  console.log(
    `headersMs   ${fmt(sortedH[0])}   ${fmt(quantile(sortedH, 0.5))}   ${fmt(quantile(sortedH, 0.95))}   ${fmt(sortedH[sortedH.length - 1])}`
  )
  console.log(
    `bodyMs      ${fmt(sortedB[0])}   ${fmt(quantile(sortedB, 0.5))}   ${fmt(quantile(sortedB, 0.95))}   ${fmt(sortedB[sortedB.length - 1])}`
  )
  console.log(
    `totalMs     ${fmt(sortedT[0])}   ${fmt(quantile(sortedT, 0.5))}   ${fmt(quantile(sortedT, 0.95))}   ${fmt(sortedT[sortedT.length - 1])}`
  )

  if (failures.length > 0) {
    console.log('')
    console.log(`${failures.length} failure(s):`)
    for (const f of failures) console.log(`  - ${f}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Syntax-check the script**

Run: `node --check scripts/bench-147ai.mjs`
Expected: no output (successful parse).

- [ ] **Step 3: Smoke-test with an obviously bad invocation to confirm the usage path works**

Run: `node scripts/bench-147ai.mjs`
Expected: exit code non-zero, stderr shows `usage: node scripts/bench-147ai.mjs <image-path> "<prompt>" [samples]`. Do NOT run the real bench here — it burns 147ai credits. The user will run it during the experiment phase.

- [ ] **Step 4: Commit**

```bash
git add scripts/bench-147ai.mjs
git commit -m "feat(scripts): add bench-147ai local direct-call script (TEMP-DIAGNOSIS)

Phase 2C of the sync edit latency diagnosis. Zero-dependency Node
script that reads .env.local manually, reads a local image file,
and runs N sequential 147ai fetch calls timing headers/body/total
per sample. Prints a min/p50/p95/max summary. If local distribution
is tight while Vercel's is wide, the problem is in the
Vercel->147ai path, not in 147ai itself. Deletes at teardown."
```

---

## Task 7: `.env.local.example` documentation

**Files:**
- Modify: `.env.local.example`

**Purpose:** Document the two new diagnosis-only env vars so the user (and any future teardown audit) has a canonical reference.

- [ ] **Step 1: Append the diagnosis section**

Edit `.env.local.example`. The current file ends at line 19 with `APP_URL=http://localhost:3000`. Append this block after that line:

```text

# TEMP-DIAGNOSIS: 2026-04-11 sync edit latency diagnosis. Remove these two
# lines (and delete the values in Vercel) after the diagnosis teardown commit.
DEBUG_SECRET=       # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
DEBUG_BENCH_IMAGE_URL=   # Public Vercel Blob URL (https://*.public.blob.vercel-storage.com/...) pointing at the ~1.1 MB fixture image
```

- [ ] **Step 2: Verify the file ends with exactly one trailing newline and no trailing spaces**

Run: `node -e "const s=require('fs').readFileSync('.env.local.example','utf8'); console.log(JSON.stringify(s.slice(-5)))"`
Expected: ends in `\n` (newline). If there are multiple trailing newlines, trim them.

- [ ] **Step 3: Commit**

```bash
git add .env.local.example
git commit -m "docs(env): document DEBUG_SECRET + DEBUG_BENCH_IMAGE_URL (TEMP-DIAGNOSIS)

Reference entries for the two env vars required by the 2026-04-11
sync edit latency diagnosis. Remove this block together with the
three debug routes at teardown."
```

---

## Task 8: Full verification before deploy

**Files:** none modified. This task runs the repo's quality gates against everything introduced by Tasks 1–7 so the user can deploy with confidence.

- [ ] **Step 1: Type-check the whole repo**

Run: `npx tsc --noEmit`
Expected: no errors. If there are errors, the offending task's subagent should be re-dispatched to fix its own changes — do not patch from Task 8.

- [ ] **Step 2: Lint the whole repo**

Run: `npm run lint`
Expected: no errors. Warnings are acceptable only if they are pre-existing in files this plan did not touch.

- [ ] **Step 3: Run all diagnosis-specific tests**

Run: `node --test --experimental-strip-types lib/debug-diagnosis.test.ts lib/image-api.test.ts`
Expected: `# pass 13` (10 from debug-diagnosis + 3 from image-api), `# fail 0`. Stderr will contain `[bench-phase1] ...` log lines from the image-api tests — expected.

- [ ] **Step 4: Run the full existing test suite to confirm no regressions**

Run: `node --test --experimental-strip-types lib/*.test.ts`
Expected: all existing tests pass plus the new ones. `# fail 0`.

- [ ] **Step 5: Production build**

Run: `npx next build`
Expected: build succeeds. The output should list the three new routes (`/api/debug/sleep60`, `/api/debug/sleep300`, `/api/debug/edit-bench`) among the route tree. If any of them are missing or marked as dynamic when they should be static (or vice-versa), investigate before deploying.

- [ ] **Step 6: Teardown dry-run (prove the teardown grep finds every diagnostic marker)**

Run: `rg -n "TEMP-DIAGNOSIS" app lib scripts`
Expected: non-empty — every file this plan creates/modifies should appear. Confirm specifically that all of these show up:

- `lib/debug-diagnosis.ts`
- `lib/debug-diagnosis.test.ts`
- `lib/image-api.ts`
- `lib/image-api.test.ts`
- `app/api/debug/sleep60/route.ts`
- `app/api/debug/sleep300/route.ts`
- `app/api/debug/edit-bench/route.ts`
- `scripts/bench-147ai.mjs`

Also run: `rg -n "bench-phase" app lib scripts`
Expected: `lib/image-api.ts` and `lib/image-api.test.ts` appear (the `[bench-phase1]` log prefix).

If any file is missing the marker, the responsible task's subagent should add the `// TEMP-DIAGNOSIS` comment. This is load-bearing for the teardown step.

- [ ] **Step 7: No commit — deploy handoff**

No commit for Task 8. The plan is implementation-complete when all six checks above pass. The controller hands off to the user for deployment and experiment execution.

---

## Post-Execution (user-driven, not part of this plan)

After Tasks 0–8 land, the user will:

1. Upload the ~1.1 MB fish-tank fixture to Vercel Blob manually (Dashboard → Storage → Blob → Upload) and record the public URL.
2. Set `DEBUG_SECRET` (generated via the command in `.env.local.example`) and `DEBUG_BENCH_IMAGE_URL` in both Vercel env vars and local `.env.local`.
3. Deploy.
4. Run the experiments per the spec's Rollout Plan (Phase 2C locally, 5 serial Phase 2B requests, Phase 3 sleep60 + sleep300 once each, a few real `editImageAction` attempts).
5. Fill the Decision Matrix in the spec.
6. Pick a remedy.
7. Execute the teardown commit:
   - Delete the three debug routes under `app/api/debug/`.
   - Delete `lib/debug-diagnosis.ts` and `lib/debug-diagnosis.test.ts`.
   - Revert `lib/image-api.ts` `editImage()` to its pre-diagnosis form (the commit immediately before Task 2's commit is the source of truth).
   - Delete `lib/image-api.test.ts`.
   - Delete `scripts/bench-147ai.mjs` (or move to `scripts/archive/` if keeping as a regression tool).
   - Remove the TEMP-DIAGNOSIS block from `.env.local.example`.
   - Verify with the teardown grep commands from the spec (spec §"Safety Requirements" — all must print nothing).
   - Delete `DEBUG_SECRET` and `DEBUG_BENCH_IMAGE_URL` from Vercel env vars.
8. Apply the chosen remedy in a separate spec / plan cycle.
