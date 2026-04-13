# P6A Review Request

## Stage
- `P6A / Canvas Foundation`

## Goal
- Ship the authenticated canvas foundation for Leo Image Studio v2: `/canvas` becomes the logged-in home, owned canvases persist in Postgres, and `/canvas/[id]` loads an Excalidraw workspace with debounced autosave and visible save state.

## Files Changed
- Routing and copy contract:
  - `middleware.ts`
  - `lib/navigation.ts`
  - `lib/navigation.test.ts`
  - `app/page.tsx`
  - `app/(auth)/login/page.tsx`
  - `app/(auth)/signup/page.tsx`
  - `app/(dashboard)/settings/page.tsx`
  - `components/workbench/sidebar-nav.tsx`
  - `components/workbench/top-context-bar.tsx`
  - `lib/i18n.ts`
  - `lib/i18n.test.ts`
- Persistence and schema groundwork:
  - `lib/canvas/state.ts`
  - `lib/canvas/state.test.ts`
  - `lib/db/schema.ts`
  - `lib/db/canvas-queries.ts`
  - `app/actions/canvas.ts`
  - `app/(dashboard)/canvas/page.tsx`
  - `app/(dashboard)/canvas/[id]/page.tsx`
  - `components/canvas/canvas-list.tsx`
  - `components/canvas/canvas-card.tsx`
- Excalidraw workspace and autosave:
  - `app/layout.tsx`
  - `components/canvas/canvas-toolbar.tsx`
  - `components/canvas/canvas-workspace.tsx`
  - `components/canvas/excalidraw-board.tsx`
  - `hooks/use-canvas-autosave.ts`
  - `package.json`
  - `package-lock.json`

## Branch / Commit Range
- Branch: `p6-v2-canvas-main`
- Base commit: `097fbc0`
- Review diff: `097fbc0..HEAD` plus the current `P6A` working-tree changes if this file is reviewed before the final phase commit

## Verification Already Run
- `node --test lib/navigation.test.ts lib/i18n.test.ts lib/canvas/state.test.ts`
- `npm run lint`
- `npm run build`
- Browser / Playwright checks on a local dev server:
  - unauthenticated `/canvas` redirects to `/login`
  - fresh signup auto-creates the first canvas and lands on `/canvas/<id>`
  - renaming the canvas persists to Postgres
  - drawing one rectangle triggers autosave and persists `canvases.state.elements`
  - refresh keeps the saved drawing
- Database checks:
  - `drizzle-kit push` applied the `canvases` table, `TIMESTAMPTZ` conversions, `images.canvasId` with `ON DELETE SET NULL`, and the stage indexes
  - direct SQL verification confirmed autosaved canvas state persisted in Postgres

## Known Risks Or Tradeoffs
- Excalidraw is a license-first choice for `P6A`, not necessarily the final long-term canvas engine.
- Autosave currently stores whole-canvas snapshots; the spec already limits V1 canvas size and asset count.
- Excalidraw tool controls were slightly flaky under Playwright, so the drawing verification used a direct DOM click on the rectangle tool test id.
- The build is green, but this machine needed elevated permissions around `.next` cache handling in the worktree during verification.

## Requested Review Focus
- Ownership / auth:
  - confirm every canvas read/write path stays scoped to `session.user.id`
  - confirm `/canvas` protection and first-run bootstrap do not leak cross-user data
- Data migration safety:
  - review the `TIMESTAMPTZ` conversion, `canvases` schema, and `images.canvasId` foreign key behavior
- Autosave correctness:
  - debounced save flow
  - stale-state or lost-update risk
  - error handling in `useCanvasAutosave`
- Excalidraw integration:
  - App Router client boundary correctness
  - persisted state shape and serialization safety
  - layout/runtime regressions from the board container sizing fix
- Navigation regression risk:
  - changing the authenticated home route from `/generate` to `/canvas`
