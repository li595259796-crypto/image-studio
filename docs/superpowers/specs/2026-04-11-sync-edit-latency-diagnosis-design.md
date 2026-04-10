# Sync Edit Latency Diagnosis v1

**Date:** 2026-04-11
**Status:** Design (pending user review)
**Scope:** Investigation-only. No production logic changes. All artifacts are temporary and MUST be removed after the investigation concludes.

## Background

After rolling the P4 async architecture back to synchronous server actions on 2026-04-10, the `editImageAction` flow is timing out with Vercel 504 Gateway Timeout at the 60-second Hobby-plan hard cap. Some attempts succeed in ~33 s (confirmed by timing logs), others hang past 59 s and get SIGKILLed by Vercel. The existing coarse timing (T0–T7) proves the hang happens inside the `await editImage(...)` call but cannot tell us *why*.

Candidate root causes we need to distinguish:

1. **147ai / Gemini tail latency** — the model itself sometimes takes >60 s to generate a result for the same input.
2. **Vercel sin1 → 147ai network path** — DNS, TLS, or routing between Vercel's Singapore region and 147ai.com adds variable latency on top of model time.
3. **Our own product-chain overhead** — auth, quota, DB, blob, magic-byte, or base64 encoding introduces unexpected blocking.
4. **Vercel runtime / 60-second cap artifacts** — the 60-second cap might be more aggressive or less aggressive than we assume, or Fluid Compute behaves differently than documented.

Each hypothesis leads to a completely different remedy (upgrade Pro, change region, fix code, switch API, change architecture). Without data we are guessing. This spec defines the minimum set of experiments that can definitively classify the failure mode.

## Goals

- **Primary:** Attribute the 504 timeout to exactly one of the four candidate root causes.
- **Secondary:** Verify the Vercel Hobby 60-second cap is real and enforced for this project.
- **Tertiary:** Produce a reusable bench script so we can re-run latency measurements after future changes.

## Non-goals

- No fix is applied in this spec. Fix is a separate follow-up chosen based on results.
- No production user-visible behavior changes.
- No new dependencies in production bundle.
- No async re-activation, no API swap, no region change beyond sin1.

## Architecture Overview

Four instrumentation artifacts, all gated by a new `DEBUG_SECRET` environment variable so they cannot be reached by random traffic.

```text
lib/image-api.ts
  └─ editImage(prompt, buffers, opts?)    # E0–E6 internal timing (TEMP-DIAGNOSIS)

app/api/debug/edit-bench/route.ts          # Phase 2B — in-Vercel isolated bench
app/api/debug/sleep60/route.ts             # Phase 3 — verify 60 s cap
app/api/debug/sleep300/route.ts            # Phase 3 — verify whether cap can be raised

scripts/bench-147ai.mjs                    # Phase 2C — local-machine direct call
```

All server-side artifacts require `Authorization: Bearer ${DEBUG_SECRET}`. If `DEBUG_SECRET` is not set in the environment, the routes return `503 Service Unavailable` (chosen over 401 so the routes don't advertise their existence to probers).

All timing logs use a short `traceId` (8 hex chars generated per request) and the prefix `[bench-<phase>]` so Vercel Runtime Logs can be grep-filtered.

## Phase 1 — `editImage()` Internal Timing

### Phase 1 change

Modify `lib/image-api.ts` so `editImage()` emits six timing points. The signature grows two optional parameters (both added in this phase, used by Phase 2B):

```typescript
editImage(
  prompt: string,
  imageBuffers: Buffer[],
  opts?: { traceId?: string; timingOut?: Record<string, number> }
): Promise<Buffer>
```

Timing points:

```text
E0 invoked         (prompt length, buffer count, total input bytes)
E1 encode start
E2 encode done     (+Δms from E0, base64 length)
E3 fetch start     (URL host, model)
E4 response headers received  (status, +Δms from E3)
E5 body parsed     (+Δms from E4, payload bytes)
E6 buffer extracted (+Δms from E5, result buffer bytes, total +Δms from E0)
```

`generateImage()` gets the same treatment for symmetry (shorter chain, no base64 encode phase). This is low priority — included for coherent logs if the user happens to test generate during diagnosis, but the spec's success criteria depend only on `editImage` data.

Logs use `console.error('[bench-phase1] <traceId> <label> ...')`. No return-value change, no error-handling change. Every added line and every new parameter is prefixed/commented with `// TEMP-DIAGNOSIS:` so the teardown grep finds them.

`traceId` behavior:

- If caller passes `opts.traceId`, `editImage` uses it.
- Otherwise `editImage` generates its own 8-hex-char id so ad-hoc callers still get a coherent trace.
- `editImageAction` also generates a traceId and passes it, so the existing T0–T7 action logs and the new E0–E6 lib logs can be correlated in Vercel Logs by grepping the same id.

`timingOut` behavior:

- If provided, `editImage` writes each phase's elapsed-ms into this object (`timingOut.e0 = 0; timingOut.e2 = 12; ...`).
- If omitted, no-op.
- Phase 2B uses this to return structured timing in its HTTP response without parsing log output.

### Phase 1 — what we learn

- Whether the hang is in base64 encoding (E1→E2), fetch initiation (E2→E3), waiting for response headers (E3→E4), body streaming (E4→E5), or buffer extraction (E5→E6).
- Rules out any hypothesis where the hang is outside the `fetch` call.

### Phase 1 — what we don't learn

- Whether the fetch wait is caused by 147ai compute time or by network/runtime path.

## Phase 2B — `/api/debug/edit-bench` Isolated Bench Route

### Phase 2B change

New route `app/api/debug/edit-bench/route.ts`.

```http
POST /api/debug/edit-bench
Authorization: Bearer ${DEBUG_SECRET}
Content-Type: application/json

{ "prompt": "string", "samples": 1 }
```

### Phase 2B — flow

1. Validate `DEBUG_SECRET`. If env var missing → 503. If header mismatch → 401.
2. Read `DEBUG_BENCH_IMAGE_URL` from env — this is a pre-populated Vercel Blob URL pointing to the test fixture image.
3. Fetch the fixture bytes (one HTTPS GET to the Blob URL).
4. Loop `samples` times:
   - Generate a fresh traceId.
   - Call `editImage(prompt, [buffer], { traceId, timingOut })`.
   - Collect timing from the Phase 1 logs via a small side-channel (see Implementation Note below).
   - Discard the result buffer.
5. Return JSON:

```json
{
  "fixtureBytes": 1167537,
  "samples": [
    {
      "traceId": "a1b2c3d4",
      "totalMs": 33205,
      "e0ToE2Ms": 12,
      "e2ToE3Ms": 1,
      "e3ToE4Ms": 29500,
      "e4ToE5Ms": 50,
      "e5ToE6Ms": 3642
    }
  ]
}
```

### Phase 2B — implementation note (side-channel)

To return timing in the HTTP response (not just logs), `editImage()` optionally accepts a `timingOut` parameter — a plain object that it fills in. Phase 2B route passes one, reads it back after the call. This keeps `editImage()` signature backward-compatible (both new params are optional) and avoids parsing its own log output.

### Phase 2B — constraints

- Does NOT call `auth()`, `checkQuota()`, `insertImage()`, `uploadImage()`, or `recordUsage()`.
- Does NOT consume user quota.
- Does NOT persist results.
- `maxDuration` is explicitly set to `60` (same as the real edit page) so the bench runs under identical Vercel limits.
- Hard-coded upper bound: `samples <= 5` per request (protects against accidental quota burn at 147ai side).

### Phase 2B — what we learn

- If this route consistently finishes in ~30 s while real `editImageAction` hits 60 s → the bottleneck is in our product chain (auth, quota, DB, blob).
- If this route hits 60 s with the same variance → the bottleneck is inside `editImage` (as Phase 1 already said) and the product chain is innocent.

### Phase 2B — what we don't learn

- Whether the variance is from 147ai itself or from Vercel→147ai network (still need Phase 2C for that).

## Phase 2C — Local Node Bench Script

### Phase 2C change

New file `scripts/bench-147ai.mjs`. Zero external dependencies beyond Node built-ins.

### Invocation

```bash
node scripts/bench-147ai.mjs <image-path> "<prompt>" [samples=5]
```

Reads `.env.local` manually to get `IMAGE_API_KEY`, `IMAGE_API_URL`, `IMAGE_MODEL` (no `dotenv` dependency — use Node 20+ `util.parseArgs` and a tiny manual parser).

### Phase 2C — flow

1. Read `image-path` from disk, compute size.
2. Base64 encode once outside the loop (so encoding cost is not repeated).
3. Build the request body matching the exact shape `editImage()` uses.
4. Loop `samples` times, timing each phase of each call with `performance.now()`:
   - `connectMs` — time until socket open (from fetch start until first response event)
   - `headersMs` — time until response headers received
   - `bodyMs` — time until body fully read
   - `totalMs` — wall-clock for the entire call
5. Print a summary table:

```text
samples: 10
image: ./test-image.jpg (1.12 MB)
prompt: "把字变红"
endpoint: 147ai.com

              min    p50    p95    max
headersMs   23100  28500  37800  41100
bodyMs        400    600   1200   1500
totalMs     24300  29100  38200  41700
```

### Execution environment

- Runs on the user's Windows machine directly (Git Bash / PowerShell — we use forward slashes and no shell-specific syntax).
- Does NOT hit Vercel in any way.
- Does NOT touch the database or blob store.

### Phase 2C — what we learn

- If local distribution is tight (min ≈ max, low variance) while Vercel shows high variance → issue is in Vercel→147ai network/runtime path.
- If local distribution is also wide (fat tail) → issue is 147ai itself.
- If local is fast but Vercel consistently slow by the same amount → issue is Vercel base latency (sin1 network hop cost).

### Phase 2C — what we don't learn

- Whether Vercel is slower because of region, runtime, or something else (but at least we'll know it's Vercel-side).

## Phase 3 — Sleep Routes for 60 s Cap Verification

### Phase 3 change

Two parallel routes:

```text
GET /api/debug/sleep60       (has maxDuration = 60 — expects to fail at 60 s)
GET /api/debug/sleep300      (has maxDuration = 300 — tests whether Hobby enforces it)
```

Both require:

```http
Authorization: Bearer ${DEBUG_SECRET}
```

Query param `?seconds=75` (default 75) controls how long to sleep.

### Phase 3 — flow

1. Validate `DEBUG_SECRET`.
2. Parse `seconds` query param, clamp to `[1, 180]`.
3. Record start time.
4. `await new Promise(r => setTimeout(r, seconds * 1000))`.
5. Return `{ requested: seconds, actual: <measured>, maxDurationDeclared: 60 | 300 }`.

### Phase 3 — expected outcomes

- `sleep60?seconds=75` → killed at ~60 s with 504 → confirms 60 s is enforced at the page/route `maxDuration` declaration level.
- `sleep300?seconds=75` → if Hobby honors the declaration, completes in 75 s; if Hobby caps regardless, killed at 60 s.
- This is the *only* way to distinguish "Hobby has a plan-wide 60 s cap" from "we set maxDuration = 60 ourselves and that's the only reason it's 60".

### Phase 3 — what we learn

- Whether Hobby actually allows `maxDuration > 60` (which would mean our current `export const maxDuration = 60` in edit/generate pages is self-inflicted, not platform-imposed).

## Environment Variables

New variables required for this diagnosis:

| Name | Where | Purpose | Cleanup |
|---|---|---|---|
| `DEBUG_SECRET` | Vercel + local | Bearer token for all debug routes | Delete after teardown |
| `DEBUG_BENCH_IMAGE_URL` | Vercel | Pre-populated Blob URL of test fixture | Delete after teardown |

Existing variables used:

- `IMAGE_API_KEY` — already present locally and on Vercel.
- `IMAGE_API_URL` — already present.
- `IMAGE_MODEL` — already present.

## Test Fixture

One physical test image used consistently across Phase 2B and Phase 2C.

**Selection:** The same ~1.1 MB fish-tank product image that has been reproducibly failing today. User re-uses it unchanged so results are comparable.

**Placement:**

1. User uploads the image once manually to Vercel Blob (via the existing `/edit` form or Vercel Dashboard → Storage → Blob → Upload). For Phase 2B we need a public, stable URL.
2. User sets `DEBUG_BENCH_IMAGE_URL` on Vercel to that URL.
3. User keeps the same image file locally at a known path (e.g. `./scripts/test-fixture.jpg`) for Phase 2C.

## Safety Requirements

Per explicit user instruction:

1. **Authentication on all debug routes.**
   - `DEBUG_SECRET` is read from env via `process.env.DEBUG_SECRET`.
   - If unset: routes return 503 with an empty body (no fingerprint).
   - If set but header mismatch: routes return 401.
   - Secret is generated by user via `openssl rand -hex 32` (or Node `crypto.randomBytes(32).toString('hex')` on Windows) and stored only in Vercel env vars + local `.env.local`.

2. **Complete teardown after diagnosis.**
   - A dedicated revert commit removes:
     - `app/api/debug/edit-bench/route.ts`
     - `app/api/debug/sleep60/route.ts`
     - `app/api/debug/sleep300/route.ts`
     - The temporary `scripts/bench-147ai.mjs` (or moves it to `scripts/archive/` if user wants to keep it as a regression tool)
     - All `// TEMP-DIAGNOSIS:` blocks in `lib/image-api.ts` and any `tlog` calls in actions that were added for diagnosis
   - Teardown commit references the diagnosis entry commit hash so future readers can find the context.
   - `grep -R "TEMP-DIAGNOSIS\|bench-phase" .` must return zero results after teardown.
   - User deletes `DEBUG_SECRET` and `DEBUG_BENCH_IMAGE_URL` from Vercel env vars.
   - User deletes the test fixture from Vercel Blob if desired (optional, it's small).

## Decision Matrix (to be filled after experiments)

| Phase 1 outcome | Phase 2B outcome | Phase 2C outcome | Root cause | Remedy direction |
|---|---|---|---|---|
| E3→E4 hangs 59 s | Also hangs 59 s | Local stable ~30 s | Vercel sin1 → 147ai network path | Try Edge runtime, different region, or proxy |
| E3→E4 hangs 59 s | Also hangs 59 s | Local also hangs / high variance | 147ai tail latency | Upgrade Pro, add retry, or switch API |
| E3→E4 hangs 59 s | Completes in ~30 s | Local fast | Our product chain introduces blocking | Audit auth / quota / blob path |
| E1→E2 dominates | Any | Any | Base64 encoding abnormally slow | Investigate buffer handling, possible Vercel runtime issue |
| All E phases complete <30 s, but real action still 60 s | N/A | N/A | Hang is outside `editImage` | Audit action wrapper, server-action serialization |
| Phase 3 sleep300 completes at 75 s | N/A | N/A | 60 s cap is self-imposed not platform-imposed | Immediately raise `maxDuration = 300` on edit/generate pages |

## Rollout Plan

1. **Implement** Phase 1 + Phase 2B + Phase 2C + Phase 3 in a single branch/commit series.
2. **Deploy** to production (required — bench routes need to run in the real Vercel environment). Debug routes are inert until `DEBUG_SECRET` is set.
3. **Configure** `DEBUG_SECRET` and `DEBUG_BENCH_IMAGE_URL` in Vercel env vars and redeploy.
4. **Run experiments:**
   - Phase 2C locally: 10 samples with same image + prompt.
   - Phase 2B from curl: 5 samples with same image + prompt.
   - Phase 3: hit both `/api/debug/sleep60?seconds=75` and `/api/debug/sleep300?seconds=75` once each.
   - Real `editImageAction`: a few attempts to confirm current behavior is unchanged.
5. **Collect data** into a table and fill the decision matrix.
6. **Pick remedy** based on matrix.
7. **Teardown** — dedicated commit, grep-verified.
8. **Apply remedy** in a separate spec / plan cycle.

## Risks

| Risk | Mitigation |
|---|---|
| Debug routes leak to the public | `DEBUG_SECRET` required, 503 when unset |
| Diagnostic logs bloat Vercel Logs quota | Temporary only; Phase 1 logs are gated by `traceId` generation and only fire during actual requests |
| Bench calls burn 147ai credits | Hard cap `samples <= 5` per bench route call; user runs <20 samples total across all experiments |
| Teardown forgotten | Spec mandates a dedicated revert commit + grep check; plan generated from this spec will include it as final step |
| Test fixture drift | Spec explicitly says to re-use the exact same image file that has been failing, not a fresh one |
| `editImage` signature change breaks callers | `traceId` and `timingOut` are optional params with defaults; existing callers compile unchanged |

## Open Questions (to be resolved during implementation)

None remaining as of this spec. If issues surface during build (e.g. `timingOut` side-channel doesn't integrate cleanly), document the deviation in the plan and proceed.

## Out of Scope

Explicitly deferred to future cycles:

- **Phase 4** (image size variants) — will be run only if Phase 2B/2C results suggest input size matters.
- **Phase 5** (AI-edit vs OCR-based local edit strategy) — product-level rethink, separate brainstorming cycle.
- Any remedy implementation.
- Any `HIGH` issues from the earlier compression code review (files.length closure race, silent compression fallback) — tracked separately, not in this spec.
