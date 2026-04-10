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
E0 invoked                       (prompt length, buffer count, total input bytes)
E1 encode start
E2 encode done                   (+Δms from E0, base64 length)
E3 fetch start                   (URL host, model)
E4 response headers received     (status, +Δms from E3)
E5 body read done                (+Δms from E4, raw payload bytes — pure network body download, NO parse)
E6 json parsed + buffer extracted (+Δms from E5, result buffer bytes, total +Δms from E0)
```

**Critical:** E4→E5 is the pure network body-download window and E5→E6 is the pure CPU json-parse + base64-extract window. These MUST NOT be merged — the implementation calls `response.text()` at E5 and only then `JSON.parse(...)` + `extractImageBuffer(...)` between E5 and E6. Folding the JSON parse into E4→E5 via `response.json()` would silently hide any CPU-bound parse hang and break the Decision Matrix row that distinguishes body-streaming slowness from JSON/buffer-parse slowness.

`generateImage()` is **explicitly out of scope for instrumentation** in this diagnosis. Only `editImage()` gets the E0–E6 treatment. Reason: the reproducing failure is edit-only, and adding timing to generate expands both the production-code blast radius and the teardown surface for no diagnostic benefit. Generate stays untouched.

The E0 log line MUST record the exact total input bytes fed to `editImage` (sum of all buffer lengths). This establishes a baseline for any future discussion of whether input size affects latency — without it, Phase 4 (image size variants, currently deferred) has no ground truth.

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

{ "prompt": "string" }
```

**No `samples` parameter.** The route performs exactly **one** `editImage` call per invocation. To collect N data points, the operator fires N independent HTTP requests (see Rollout Plan).

### Phase 2B — flow

1. Validate `DEBUG_SECRET`. If env var missing → 503. If header mismatch → 401.
2. Read `DEBUG_BENCH_IMAGE_URL` from env and **validate it** before fetching:
   - Must parse as a URL.
   - Protocol must be `https:`.
   - Hostname must end with `.public.blob.vercel-storage.com` (the Vercel Blob public domain).
   - If any check fails → return 500 with `{"error":"DEBUG_BENCH_IMAGE_URL invalid"}` and do NOT make the fetch.
   - Rationale: the route runs in production and is authenticated only by `DEBUG_SECRET`. Blocking arbitrary hostnames prevents an env-misconfiguration or token-leak scenario from turning the route into an SSRF vector.
3. Record `fixtureFetchStart = Date.now()`.
4. Fetch the fixture bytes (one HTTPS GET to the validated Blob URL).
5. Record `fixtureFetchMs = Date.now() - fixtureFetchStart`.
6. Generate a fresh traceId and call `editImage(prompt, [buffer], { traceId, timingOut })` **once**. Discard the result buffer.
7. Return JSON:

```json
{
  "fixtureBytes": 1167537,
  "fixtureFetchMs": 215,
  "sample": {
    "traceId": "a1b2c3d4",
    "totalMs": 33205,
    "e0ToE2Ms": 12,
    "e2ToE3Ms": 1,
    "e3ToE4Ms": 29500,
    "e4ToE5Ms": 50,
    "e5ToE6Ms": 3642
  }
}
```

`fixtureBytes` is load-bearing: the Decision Matrix row "Phase 2B fast but fixture bytes differ from real action" depends on being able to compare this number against the `T2 magic-byte done (... N bytes)` line emitted by the real `editImageAction`. Do not remove it from the response, even if the sample fails.

`fixtureFetchMs` is load-bearing too: the route runs under `maxDuration = 60`, and the Blob fetch eats into that budget before `editImage` even starts. If Blob pull ever climbs into multi-second territory, a "slow" Phase 2B sample could be entirely Blob-pull cost rather than `editImage` cost. Logging it explicitly prevents that misattribution.

### Phase 2B — implementation note (side-channel)

To return timing in the HTTP response (not just logs), `editImage()` optionally accepts a `timingOut` parameter — a plain object that it fills in. Phase 2B route passes one, reads it back after the call. This keeps `editImage()` signature backward-compatible (both new params are optional) and avoids parsing its own log output.

### Phase 2B — constraints

- Does NOT call `auth()`, `checkQuota()`, `insertImage()`, `uploadImage()`, or `recordUsage()`.
- Does NOT consume user quota.
- Does NOT persist results.
- `maxDuration` is explicitly set to `60` (same as the real edit page) so the bench runs under identical Vercel limits.
- **Exactly one `editImage` call per request.** No in-route loop, no `samples` parameter. Rationale: `editImage` alone takes ~30 s on the baseline fixture, so two sequential samples in the same invocation would exceed the 60 s cap and produce a false-positive timeout attributed to `editImage` rather than to the loop's own arithmetic. Multiple data points come from multiple independent HTTP requests, each with a fresh 60 s budget.

### Phase 2B — what we learn

- If this route consistently finishes in ~30 s while real `editImageAction` hits 60 s → the bottleneck is **not** inside `editImage` itself with this fixture. The difference lives somewhere in the real action's execution context or input path (see Decision Matrix row 3 for the candidate list and remediation steps).
- If this route hits 60 s with the same variance → the bottleneck is inside `editImage` (as Phase 1 already said) and the rest of the action chain is innocent.

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
   - `headersMs` — time from `fetch()` invocation until the Response promise resolves (headers received)
   - `bodyMs` — time from headers received until `response.json()` (or `.arrayBuffer()`) resolves
   - `totalMs` — wall-clock for the entire call

**Note on omitted metrics:** We intentionally do NOT measure socket-open / DNS / TLS separately. Node's built-in `fetch` (undici) does not expose those phases without a custom `Dispatcher` or `diagnostics_channel` hook, and pulling that in expands scope and dependencies. If Phase 2C shows a suspicious gap *before* `headersMs` grows (i.e., the issue is pre-connection), we'll add targeted `curl -w` measurements as a follow-up rather than bloating this script.
5. Print a summary table:

```text
samples: 10
image: ./test-image.jpg (1.12 MB)
prompt: "把字变红"
endpoint: 147ai.com

              min    p50    p95    max
headersMs   23100  28500  37800  41100
bodyMs        400    600   1200   1500
totalMs     23500  29100  39000  42600
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
   - **Teardown verification must scope out the spec itself, node_modules, and build output** (this spec file contains the marker strings in example snippets and will always match). Run these checks in `app/`, `lib/`, and `scripts/` only:

     ```bash
     # All of these must print nothing.
     rg -n "TEMP-DIAGNOSIS" app lib scripts
     rg -n "bench-phase" app lib scripts
     rg -n "\[generate-timing\]|\[edit-timing\]" app lib
     # And the debug route directory must not exist.
     test ! -d app/api/debug && echo "ok: app/api/debug removed"
     ```

     `rg` is preferred over `grep -R` because it honors `.gitignore` by default (so `.next/` and `node_modules/` are auto-excluded) and behaves consistently on the user's Windows / Git Bash environment.
   - User deletes `DEBUG_SECRET` and `DEBUG_BENCH_IMAGE_URL` from Vercel env vars.
   - User deletes the test fixture from Vercel Blob if desired (optional, it's small).

## Decision Matrix (to be filled after experiments)

| Phase 1 outcome | Phase 2B outcome | Phase 2C outcome | Root cause | Remedy direction |
|---|---|---|---|---|
| E3→E4 hangs 59 s | Also hangs 59 s | Local stable ~30 s | Vercel sin1 → 147ai network path | Try Edge runtime, different region, or proxy |
| E3→E4 hangs 59 s | Also hangs 59 s | Local also hangs / high variance | 147ai tail latency | Upgrade Pro, add retry, or switch API |
| E3→E4 hangs 59 s | Completes in ~30 s (same fixture bytes as real action) | Local fast | Something in the real action's execution context differs from the bench route's (NOT auth/quota/blob — those run before `editImage` and can't extend E3→E4 retroactively). Candidates: different function instance region, different cold/warm state, different memory tier, different request-scoped headers/env, or request-body streaming back-pressure from the server-action multipart path affecting the outbound fetch. | Compare the two runtime contexts side-by-side — exact deployed region, function memory config, Node runtime version, `process.env` subset, whether the action ran on a cold or warm instance, and the exact bytes fed to `editImage`. Also try invoking `editImage` from inside `editImageAction` with the fixture buffer (bypass form parsing) to see if `FormData.arrayBuffer()` is leaving an open stream. |
| E3→E4 hangs 59 s | Completes in ~30 s but fixture bytes differ from real action | Any | Cannot attribute yet — fixture mismatch | Re-run Phase 2B with the EXACT bytes the failing real action used; do not conclude until fixtures match |
| E1→E2 dominates (>5 s on 1 MB input) | Any | Any | Base64 encoding abnormally slow | Investigate buffer handling, possible Vercel runtime/CPU issue |
| E4→E5 dominates (body streaming hangs) | Same pattern | Same pattern | 147ai slow body streaming OR large result payload | Inspect payload size, check if streaming parse helps, consider smaller output format |
| E4→E5 dominates | Same pattern | Local E4→E5 fast | Vercel → 147ai return path slow on body bytes | Same remedies as network-path row (region/proxy/Edge) |
| E5→E6 dominates (JSON/buffer parse hang) | Same pattern | Same pattern | JSON decode of huge base64 payload pegs event loop | Switch to streaming or binary response format, or chunk the decode |
| All E phases complete <30 s, but real action still 60 s | N/A | N/A | Hang is outside `editImage` (wrapper/serialization/magic-byte) | Audit action wrapper, server-action form parsing, magic-byte step |
| Phase 3 `sleep300?seconds=75` completes in ~75 s | N/A | N/A | 60 s cap is self-imposed via `maxDuration = 60` on edit/generate, not platform-imposed | Raise `maxDuration` to 120–300 on those pages as an immediate mitigation |
| Phase 3 `sleep300?seconds=75` also killed at ~60 s | N/A | N/A | Hobby plan enforces a 60 s ceiling regardless of `maxDuration` declaration | `maxDuration` is a dead lever. Remedies: enable Fluid Compute if applicable, upgrade plan, or redesign chain to stay under 60 s (compression, async worker on a different platform, etc.) |

## Rollout Plan

1. **Implement** Phase 1 + Phase 2B + Phase 2C + Phase 3 in a single branch/commit series.
2. **Deploy** to production (required — bench routes need to run in the real Vercel environment). Debug routes are inert until `DEBUG_SECRET` is set.
3. **Configure** `DEBUG_SECRET` and `DEBUG_BENCH_IMAGE_URL` in Vercel env vars and redeploy.
4. **Run experiments:**
   - Phase 2C locally: 10 iterations inside the single script invocation (local machine has no 60 s cap).
   - Phase 2B: fire **5 independent curl requests** to `/api/debug/edit-bench`, one at a time, each with its own fresh 60 s Vercel budget. Do NOT issue them in parallel (would distort both 147ai-side load and Vercel cold-start effects). Record each response's `fixtureBytes`, `fixtureFetchMs`, `totalMs`, and the E-phase breakdown.
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
