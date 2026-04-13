# P6B Review Request

## Stage
- `P6B / Multi-Model Compare`

## Goal
- Ship the first multi-model canvas generation slice for Leo Image Studio v2: one authenticated request fans out to Gemini / Seedream / Tongyi, streams per-model results over SSE, persists `generationJobs`, and lets `/canvas/[id]` place placeholders, replace them with completed images, and recover completed-but-not-yet-persisted results after refresh.

## Files Changed
- Model contracts, adapters, and routing:
  - `lib/models/types.ts`
  - `lib/models/constants.ts`
  - `lib/models/registry.test.ts`
  - `lib/models/router.ts`
  - `lib/models/router.test.ts`
  - `lib/models/gemini-flash.ts`
  - `lib/models/seedream.ts`
  - `lib/models/tongyi.ts`
  - `lib/models/adapters.test.ts`
- Request / streaming / persistence:
  - `lib/generation/request.ts`
  - `lib/generation/request.test.ts`
  - `lib/generation/sse.ts`
  - `lib/generation/sse.test.ts`
  - `app/api/generate/route.ts`
  - `app/api/canvas/save/route.ts`
  - `lib/db/schema.ts`
  - `lib/db/queries.ts`
  - `lib/db/generation-queries.ts`
  - `lib/image-api.ts`
  - `lib/storage.ts`
  - `tsconfig.json`
- Canvas-side client flow:
  - `app/(dashboard)/canvas/[id]/page.tsx`
  - `components/canvas/canvas-workspace.tsx`
  - `components/canvas/excalidraw-board.tsx`
  - `components/canvas/generation-panel.tsx`
  - `components/canvas/generation-result-strip.tsx`
  - `hooks/use-canvas-generation-stream.ts`
  - `hooks/use-canvas-generation-stream.test.ts`
  - `lib/canvas/generation-elements.ts`
  - `lib/canvas/generation-elements.test.ts`
  - `lib/i18n.ts`
- Plan / adapter notes:
  - `docs/superpowers/plans/2026-04-13-p6b-multi-model-compare.md`
  - `docs/superpowers/plans/2026-04-13-p6b-adapter-reference.md`

## Branch / Commit Range
- Branch: `p6-v2-canvas-main`
- Base commit: `ff62a6b`
- Review diff: `ff62a6b..HEAD` plus the current working-tree changes if reviewed before the final P6B client commit lands

## Verification Already Run
- Pure / contract tests:
  - `node --test --test-isolation=none hooks/use-canvas-generation-stream.test.ts lib/canvas/generation-elements.test.ts lib/models/router.test.ts lib/models/adapters.test.ts lib/models/registry.test.ts lib/generation/request.test.ts lib/generation/sse.test.ts`
- Focused lint:
  - `npm run lint -- "app\\(dashboard)\\canvas\\[id]\\page.tsx" components\\canvas\\canvas-workspace.tsx components\\canvas\\excalidraw-board.tsx components\\canvas\\generation-panel.tsx components\\canvas\\generation-result-strip.tsx hooks\\use-canvas-generation-stream.ts lib\\canvas\\generation-elements.ts lib\\db\\generation-queries.ts lib\\i18n.ts`
- Production build:
  - `npm run build`
- Database checks already applied during the backend slice:
  - `drizzle-kit push --config drizzle.config.ts`

## Known Risks Or Tradeoffs
- The SSE route currently uses platform quota only; BYOK lands in `P6C`.
- `placeholderKey` is now the stable client-side bridge for placeholder -> completion replacement. This avoids same-model collisions, but it adds one more client-only identity to audit.
- Recovery currently rehydrates completed jobs by `imageId` if the image is not already present in persisted canvas state. Placement for recovered items uses sequential fallback slots, not original in-flight placeholder geometry.
- Browser / Playwright verification for the new generation panel has not been run yet in this phase; this review is especially valuable for client integration blind spots.

## Requested Review Focus
- Auth / ownership:
  - confirm `/api/generate` and `/api/canvas/save` stay scoped to `session.user.id`
  - confirm `canvasId` ownership checks and recovery queries cannot leak cross-user jobs or assets
- Streaming correctness:
  - SSE event contract and client parser robustness
  - fatal / partial failure handling
  - multiple model results arriving out of order
- Canvas integration:
  - Excalidraw placeholder insertion and replacement correctness
  - risk of duplicate recovered images after refresh
  - autosave interaction with imperative board updates
- Provider safety:
  - SSRF whitelist enforcement
  - provider error mapping / timeout mapping
  - Seedream / Tongyi response parsing assumptions
- Quota / rate-limit logic:
  - platform-only quota counting
  - per-minute rate limiting
  - one-request-many-models accounting
