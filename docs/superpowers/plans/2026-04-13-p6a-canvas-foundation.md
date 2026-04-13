# P6A Canvas Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the authenticated canvas foundation for Leo Image Studio v2: `/canvas` becomes the logged-in home, canvases persist in Postgres with ownership protections, and users can open an Excalidraw-backed workspace with autosave and a visible dirty/saving state.

**Architecture:** Build this phase in three layers. First, centralize the new canvas route contract and workbench copy so the app consistently treats `/canvas` as the new dashboard home. Second, add a focused canvas persistence layer (`canvases` table, helpers, queries, and server actions) with size limits and ownership-safe reads/writes. Third, mount an Excalidraw client shell inside the existing workbench layout and connect it to debounced autosave so this phase ships a real project surface before multi-model generation arrives in P6B.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Drizzle ORM, Vercel Postgres, shadcn/ui, Tailwind CSS 4, Excalidraw, node:test

---

## File Map

- Create: `lib/navigation.ts` - single source of truth for the logged-in home route and dashboard route metadata
- Create: `lib/navigation.test.ts` - route contract tests so `/canvas` stays the authenticated home
- Create: `lib/canvas/state.ts` - canvas constants, empty-state factory, name sanitizing, and JSON size guards
- Create: `lib/canvas/state.test.ts` - pure tests for canvas name/state serialization helpers
- Create: `lib/db/canvas-queries.ts` - canvas-specific reads/writes and ownership-safe lookups, keeping `lib/db/queries.ts` from growing further
- Create: `app/actions/canvas.ts` - authenticated server actions for create, rename, autosave, and delete-from-list flows
- Create: `app/(dashboard)/canvas/page.tsx` - canvas index route that auto-creates the first canvas when needed
- Create: `app/(dashboard)/canvas/[id]/page.tsx` - detail route that loads one owned canvas into the workbench
- Create: `components/canvas/canvas-list.tsx` - grid/list of saved canvases for returning users
- Create: `components/canvas/canvas-card.tsx` - one canvas card with open, rename, and delete affordances
- Create: `components/canvas/canvas-workspace.tsx` - main client shell for Excalidraw, dirty indicator, and autosave status
- Create: `components/canvas/canvas-toolbar.tsx` - page-local controls (rename, save status, zoom label placeholder, new canvas action)
- Create: `components/canvas/excalidraw-board.tsx` - isolated Excalidraw wrapper with normalized snapshot output
- Create: `hooks/use-canvas-autosave.ts` - debounced autosave hook that serializes snapshots through server actions
- Modify: `middleware.ts` - protect `/canvas` and redirect authenticated auth-page visits to the new home
- Modify: `app/page.tsx` - redirect authenticated root visits to `/canvas`
- Modify: `app/(auth)/login/page.tsx` - post-login redirect target becomes `/canvas`
- Modify: `app/(auth)/signup/page.tsx` - post-signup redirect target becomes `/canvas`
- Modify: `app/(dashboard)/settings/page.tsx` - fallback redirect target becomes `/canvas`
- Modify: `app/(dashboard)/layout.tsx` - continue using the workbench shell while allowing canvas routes to inherit quota/profile chrome
- Modify: `components/workbench/sidebar-nav.tsx` - add `Canvas` as the first primary nav item
- Modify: `components/workbench/top-context-bar.tsx` - add route titles/descriptions for `/canvas` and `/canvas/[id]`
- Modify: `lib/i18n.ts` - add the canvas copy contract for navigation, list state, autosave, rename/delete, and detail page messaging
- Modify: `lib/i18n.test.ts` - extend the locked locale contract with canvas keys
- Modify: `lib/db/schema.ts` - add `canvases`, convert timestamps to timestamptz semantics, and add the canvas foreign key/index groundwork used in this phase

---

## Task 1: Lock The Canvas Route And Copy Contract

**Files:**
- Create: `lib/navigation.ts`
- Create: `lib/navigation.test.ts`
- Modify: `middleware.ts`
- Modify: `app/page.tsx`
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/signup/page.tsx`
- Modify: `app/(dashboard)/settings/page.tsx`
- Modify: `components/workbench/sidebar-nav.tsx`
- Modify: `components/workbench/top-context-bar.tsx`
- Modify: `lib/i18n.ts`
- Modify: `lib/i18n.test.ts`

- [ ] **Step 1: Write the failing route and copy contract tests**

```ts
// lib/navigation.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
import {
  DASHBOARD_HOME,
  AUTH_PROTECTED_PREFIXES,
  getWorkbenchRouteKey,
} from './navigation.ts'

test('uses /canvas as the logged-in dashboard home', () => {
  assert.equal(DASHBOARD_HOME, '/canvas')
  assert.ok(AUTH_PROTECTED_PREFIXES.includes('/canvas'))
})

test('maps canvas routes to the canvas workbench context key', () => {
  assert.equal(getWorkbenchRouteKey('/canvas'), 'canvas')
  assert.equal(getWorkbenchRouteKey('/canvas/123'), 'canvas')
  assert.equal(getWorkbenchRouteKey('/generate'), 'generate')
})
```

```ts
// lib/i18n.test.ts
test('locks the canvas copy contract in both locales', () => {
  for (const locale of locales) {
    const localeCopy = copy[locale]

    assertNonEmptyText(localeCopy.nav.canvas, `${locale}.nav.canvas`)
    assertNonEmptyText(localeCopy.canvas.listTitle, `${locale}.canvas.listTitle`)
    assertNonEmptyText(localeCopy.canvas.listDescription, `${locale}.canvas.listDescription`)
    assertNonEmptyText(localeCopy.canvas.emptyTitle, `${locale}.canvas.emptyTitle`)
    assertNonEmptyText(localeCopy.canvas.emptyDescription, `${locale}.canvas.emptyDescription`)
    assertNonEmptyText(localeCopy.canvas.newCanvas, `${locale}.canvas.newCanvas`)
    assertNonEmptyText(localeCopy.canvas.renameAction, `${locale}.canvas.renameAction`)
    assertNonEmptyText(localeCopy.canvas.deleteAction, `${locale}.canvas.deleteAction`)
    assertNonEmptyText(localeCopy.canvas.autosaveIdle, `${locale}.canvas.autosaveIdle`)
    assertNonEmptyText(localeCopy.canvas.autosaveSaving, `${locale}.canvas.autosaveSaving`)
    assertNonEmptyText(localeCopy.canvas.autosaveSaved, `${locale}.canvas.autosaveSaved`)
    assertNonEmptyText(localeCopy.canvas.autosaveError, `${locale}.canvas.autosaveError`)
  }
})
```

- [ ] **Step 2: Run the tests to confirm the current code is missing the canvas contract**

Run: `node --test lib/navigation.test.ts lib/i18n.test.ts`

Expected: FAIL with missing module `./navigation.ts` and missing locale keys such as `nav.canvas` or `canvas.listTitle`

- [ ] **Step 3: Add the shared navigation helper and re-point all dashboard-home redirects**

```ts
// lib/navigation.ts
export const DASHBOARD_HOME = '/canvas' as const

export const AUTH_PROTECTED_PREFIXES = [
  '/canvas',
  '/generate',
  '/edit',
  '/gallery',
  '/settings',
  '/upgrade',
] as const

export function getWorkbenchRouteKey(pathname: string) {
  if (pathname.startsWith('/canvas')) return 'canvas' as const
  if (pathname.startsWith('/generate')) return 'generate' as const
  if (pathname.startsWith('/edit')) return 'edit' as const
  if (pathname.startsWith('/gallery')) return 'gallery' as const
  if (pathname.startsWith('/settings')) return 'settings' as const
  if (pathname.startsWith('/upgrade')) return 'upgrade' as const
  return 'default' as const
}
```

```ts
// middleware.ts
import { AUTH_PROTECTED_PREFIXES, DASHBOARD_HOME } from '@/lib/navigation'

const protectedRoutes = [...AUTH_PROTECTED_PREFIXES]

if (isAuthRoute && isLoggedIn) {
  return NextResponse.redirect(new URL(DASHBOARD_HOME, req.url))
}
```

```ts
// app/page.tsx, app/(auth)/login/page.tsx, app/(auth)/signup/page.tsx, app/(dashboard)/settings/page.tsx
import { DASHBOARD_HOME } from '@/lib/navigation'

redirect(DASHBOARD_HOME)
router.push(DASHBOARD_HOME)
```

- [ ] **Step 4: Extend the locale dictionary and workbench UI for canvas-first navigation**

```ts
// lib/i18n.ts
interface LocaleCopy {
  nav: {
    canvas: string
    generate: string
    edit: string
    gallery: string
    login: string
    logout: string
    quotaToday: string
    localeZh: string
    localeEn: string
    settings: string
    upgrade: string
  }
  canvas: {
    listTitle: string
    listDescription: string
    emptyTitle: string
    emptyDescription: string
    newCanvas: string
    untitled: string
    openAction: string
    renameAction: string
    deleteAction: string
    detailTitle: string
    detailDescription: string
    autosaveIdle: string
    autosaveSaving: string
    autosaveSaved: string
    autosaveError: string
  }
}
```

```tsx
// components/workbench/sidebar-nav.tsx
type CanvasHref = '/canvas' | '/generate' | '/edit' | '/gallery' | '/settings' | '/upgrade'

const navItems: WorkbenchNavItem[] = [
  { href: '/canvas', label: dictionary.nav.canvas, icon: LayoutGrid, group: 'primary' },
  { href: '/generate', label: dictionary.scenario.pageTitle, icon: Wand2, group: 'primary' },
  { href: '/edit', label: dictionary.nav.edit, icon: Sparkles, group: 'primary' },
  { href: '/gallery', label: dictionary.gallery.libraryTitle, icon: Images, group: 'primary' },
  { href: '/settings', label: dictionary.nav.settings, icon: Settings, group: 'secondary' },
  { href: '/upgrade', label: dictionary.nav.upgrade, icon: ArrowUpCircle, group: 'secondary' },
]
```

```tsx
// components/workbench/top-context-bar.tsx
import { getWorkbenchRouteKey } from '@/lib/navigation'

const titles = {
  canvas: dictionary.canvas.detailTitle,
  generate: dictionary.scenario.pageTitle,
  edit: dictionary.nav.edit,
  gallery: dictionary.gallery.libraryTitle,
  settings: dictionary.settings.pageTitle,
  upgrade: dictionary.upgrade.pageTitle,
  default: dictionary.landing.workbenchLabel,
} as const
```

- [ ] **Step 5: Re-run the route and locale tests**

Run: `node --test lib/navigation.test.ts lib/i18n.test.ts`

Expected: PASS

- [ ] **Step 6: Run lint before committing the routing contract**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/navigation.ts lib/navigation.test.ts middleware.ts app/page.tsx app/(auth)/login/page.tsx app/(auth)/signup/page.tsx app/(dashboard)/settings/page.tsx components/workbench/sidebar-nav.tsx components/workbench/top-context-bar.tsx lib/i18n.ts lib/i18n.test.ts
git commit -m "feat(canvas): lock canvas-first navigation contract"
```

## Task 2: Add Canvas Persistence Primitives And Database Groundwork

**Files:**
- Create: `lib/canvas/state.ts`
- Create: `lib/canvas/state.test.ts`
- Create: `lib/db/canvas-queries.ts`
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Write the failing canvas helper tests**

```ts
// lib/canvas/state.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'

// @ts-expect-error Direct .ts import keeps node --test working in this repo.
import {
  CANVAS_STATE_MAX_BYTES,
  DEFAULT_CANVAS_NAME,
  createEmptyCanvasState,
  sanitizeCanvasName,
  assertCanvasStateWithinLimit,
} from './state.ts'

test('creates a minimal empty canvas snapshot', () => {
  const snapshot = createEmptyCanvasState()

  assert.deepEqual(snapshot.elements, [])
  assert.equal(typeof snapshot.appState, 'object')
  assert.equal(typeof snapshot.files, 'object')
})

test('sanitizes blank names back to the default canvas name', () => {
  assert.equal(sanitizeCanvasName('   '), DEFAULT_CANVAS_NAME)
  assert.equal(sanitizeCanvasName(' Product Board '), 'Product Board')
})

test('rejects oversized serialized canvas snapshots', () => {
  const oversized = {
    elements: [],
    appState: {},
    files: {},
    notes: 'x'.repeat(CANVAS_STATE_MAX_BYTES + 1),
  }

  assert.throws(
    () => assertCanvasStateWithinLimit(oversized),
    /Canvas state exceeds/
  )
})
```

- [ ] **Step 2: Run the helper test to confirm the module does not exist yet**

Run: `node --test lib/canvas/state.test.ts`

Expected: FAIL with missing module `./state.ts`

- [ ] **Step 3: Implement the pure canvas state helper module**

```ts
// lib/canvas/state.ts
export const DEFAULT_CANVAS_NAME = 'Untitled Canvas'
export const CANVAS_STATE_MAX_BYTES = 5_000_000
export const CANVAS_ASSET_LIMIT = 100

export interface PersistedCanvasState {
  elements: unknown[]
  appState: Record<string, unknown>
  files: Record<string, unknown>
}

export function createEmptyCanvasState(): PersistedCanvasState {
  return {
    elements: [],
    appState: {
      viewBackgroundColor: '#f7f4ee',
      gridSize: null,
    },
    files: {},
  }
}

export function sanitizeCanvasName(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 120) : DEFAULT_CANVAS_NAME
}

export function assertCanvasStateWithinLimit(value: PersistedCanvasState) {
  const serialized = JSON.stringify(value)
  const size = Buffer.byteLength(serialized, 'utf8')

  if (size > CANVAS_STATE_MAX_BYTES) {
    throw new Error(`Canvas state exceeds ${CANVAS_STATE_MAX_BYTES} bytes`)
  }

  return serialized
}
```

- [ ] **Step 4: Extend the Drizzle schema with canvases and timestamptz-safe columns**

```ts
// lib/db/schema.ts
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const canvases = pgTable(
  'canvases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').default(DEFAULT_CANVAS_NAME).notNull(),
    state: jsonb('state').$type<PersistedCanvasState>().notNull(),
    thumbnailUrl: text('thumbnailUrl'),
    lastOpenedAt: timestamp('lastOpenedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('canvases_user_updated_idx').on(table.userId, table.updatedAt),
    index('canvases_user_last_opened_idx').on(table.userId, table.lastOpenedAt),
  ]
)

export const images = pgTable('images', {
  // existing columns ...
  canvasId: uuid('canvasId').references(() => canvases.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('createdAt', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
})
```

```ts
// lib/db/canvas-queries.ts
export async function listCanvasesForUser(userId: string) {
  return db
    .select({
      id: canvases.id,
      name: canvases.name,
      thumbnailUrl: canvases.thumbnailUrl,
      updatedAt: canvases.updatedAt,
      lastOpenedAt: canvases.lastOpenedAt,
    })
    .from(canvases)
    .where(eq(canvases.userId, userId))
    .orderBy(desc(canvases.lastOpenedAt), desc(canvases.updatedAt))
}
```

- [ ] **Step 5: Re-run the helper test and generate the schema change**

Run: `node --test lib/canvas/state.test.ts`

Expected: PASS

Run: `npx drizzle-kit push`

Expected: SUCCESS and a `canvases` table appears in the connected database without dropping existing image rows

- [ ] **Step 6: Run lint after schema/query edits**

Run: `npm run lint`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/canvas/state.ts lib/canvas/state.test.ts lib/db/schema.ts lib/db/canvas-queries.ts
git commit -m "feat(canvas): add persistence schema and helpers"
```

## Task 3: Add Owned Canvas Routes And Server Actions

**Files:**
- Create: `app/actions/canvas.ts`
- Create: `app/(dashboard)/canvas/page.tsx`
- Create: `app/(dashboard)/canvas/[id]/page.tsx`
- Create: `components/canvas/canvas-list.tsx`
- Create: `components/canvas/canvas-card.tsx`
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Write a failing server-side flow test for first-canvas bootstrap rules**

```ts
// lib/canvas/state.test.ts
test('keeps the default canvas name stable for first-run bootstrap', () => {
  assert.equal(DEFAULT_CANVAS_NAME, 'Untitled Canvas')
  assert.equal(sanitizeCanvasName(null), 'Untitled Canvas')
})
```

Expected: This new assertion already passes once Task 2 is complete and becomes the guardrail for the route logic below.

- [ ] **Step 2: Implement authenticated canvas actions with ownership checks**

```ts
// app/actions/canvas.ts
'use server'

import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  createCanvasForUser,
  deleteCanvasForUser,
  getCanvasByIdAndUser,
  renameCanvasForUser,
  saveCanvasStateForUser,
} from '@/lib/db/canvas-queries'
import { assertCanvasStateWithinLimit, createEmptyCanvasState, sanitizeCanvasName } from '@/lib/canvas/state'

async function requireUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export async function createCanvasAction(name?: string) {
  const userId = await requireUserId()
  const canvas = await createCanvasForUser(userId, {
    name: sanitizeCanvasName(name),
    state: createEmptyCanvasState(),
  })
  revalidatePath('/canvas')
  return { id: canvas.id }
}

export async function saveCanvasStateAction(canvasId: string, state: PersistedCanvasState) {
  const userId = await requireUserId()
  assertCanvasStateWithinLimit(state)
  await saveCanvasStateForUser(userId, canvasId, state)
  revalidatePath('/canvas')
}
```

- [ ] **Step 3: Build the list route so new users land inside a real canvas immediately**

```tsx
// app/(dashboard)/canvas/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createEmptyCanvasState, DEFAULT_CANVAS_NAME } from '@/lib/canvas/state'
import { createCanvasForUser, listCanvasesForUser } from '@/lib/db/canvas-queries'
import { CanvasList } from '@/components/canvas/canvas-list'

export default async function CanvasPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const canvases = await listCanvasesForUser(userId)

  if (canvases.length === 0) {
    const firstCanvas = await createCanvasForUser(userId, {
      name: DEFAULT_CANVAS_NAME,
      state: createEmptyCanvasState(),
    })
    redirect(`/canvas/${firstCanvas.id}`)
  }

  return <CanvasList canvases={canvases} />
}
```

```tsx
// app/(dashboard)/canvas/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCanvasByIdAndUser, touchCanvasLastOpenedAt } from '@/lib/db/canvas-queries'
import { CanvasWorkspace } from '@/components/canvas/canvas-workspace'

export default async function CanvasDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const canvas = await getCanvasByIdAndUser(session.user.id, id)
  if (!canvas) notFound()

  await touchCanvasLastOpenedAt(session.user.id, id)

  return <CanvasWorkspace canvas={canvas} />
}
```

- [ ] **Step 4: Add simple list-card UI before wiring Excalidraw**

```tsx
// components/canvas/canvas-list.tsx
export function CanvasList({ canvases }: { canvases: CanvasListItem[] }) {
  const { dictionary } = useLocale()

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{dictionary.canvas.listTitle}</h1>
        <p className="text-sm text-muted-foreground">{dictionary.canvas.listDescription}</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canvases.map((canvas) => (
          <CanvasCard key={canvas.id} canvas={canvas} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify the route layer compiles**

Run: `npm run build`

Expected: PASS and both `/canvas` and `/canvas/[id]` compile in the dashboard app

- [ ] **Step 6: Commit**

```bash
git add app/actions/canvas.ts app/(dashboard)/canvas/page.tsx app/(dashboard)/canvas/[id]/page.tsx components/canvas/canvas-list.tsx components/canvas/canvas-card.tsx app/(dashboard)/layout.tsx
git commit -m "feat(canvas): add owned canvas routes and actions"
```

## Task 4: Mount Excalidraw And Debounced Autosave

**Files:**
- Create: `components/canvas/excalidraw-board.tsx`
- Create: `components/canvas/canvas-toolbar.tsx`
- Create: `components/canvas/canvas-workspace.tsx`
- Create: `hooks/use-canvas-autosave.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install Excalidraw in the worktree**

Run: `npm.cmd install @excalidraw/excalidraw`

Expected: SUCCESS and `package.json` / `package-lock.json` record the new dependency

- [ ] **Step 2: Write a failing autosave serialization assertion**

```ts
// lib/canvas/state.test.ts
test('serializes repeated snapshots consistently for dirty tracking', () => {
  const base = createEmptyCanvasState()
  const first = assertCanvasStateWithinLimit(base)
  const second = assertCanvasStateWithinLimit(structuredClone(base))

  assert.equal(first, second)
})
```

Run: `node --test lib/canvas/state.test.ts`

Expected: PASS after Task 2 helpers exist, confirming the dirty-check input is stable

- [ ] **Step 3: Implement the board wrapper and autosave hook**

```ts
// hooks/use-canvas-autosave.ts
'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { saveCanvasStateAction } from '@/app/actions/canvas'
import { assertCanvasStateWithinLimit, type PersistedCanvasState } from '@/lib/canvas/state'

export function useCanvasAutosave(canvasId: string, initialSerialized: string) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()
  const latestSerializedRef = useRef(initialSerialized)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  function queueSave(nextState: PersistedCanvasState) {
    const serialized = assertCanvasStateWithinLimit(nextState)
    if (serialized === latestSerializedRef.current) return

    latestSerializedRef.current = serialized
    setStatus('saving')

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          await saveCanvasStateAction(canvasId, nextState)
          setStatus('saved')
        } catch {
          setStatus('error')
        }
      })
    }, 800)
  }

  return { queueSave, status, isPending, isDirty: status === 'saving' || status === 'error' }
}
```

```tsx
// components/canvas/excalidraw-board.tsx
'use client'

import { Excalidraw } from '@excalidraw/excalidraw'

export function ExcalidrawBoard({
  initialData,
  onSnapshotChange,
}: {
  initialData: PersistedCanvasState
  onSnapshotChange: (nextState: PersistedCanvasState) => void
}) {
  return (
    <div className="h-[calc(100vh-9rem)] min-h-[560px] overflow-hidden rounded-[28px] border border-border/70 bg-[#f7f4ee]">
      <Excalidraw
        initialData={initialData}
        onChange={(elements, appState, files) => {
          onSnapshotChange({
            elements,
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              scrollX: appState.scrollX,
              scrollY: appState.scrollY,
              zoom: appState.zoom,
            },
            files,
          })
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Compose the client workspace with a visible save state**

```tsx
// components/canvas/canvas-workspace.tsx
'use client'

import { useMemo } from 'react'
import { useCanvasAutosave } from '@/hooks/use-canvas-autosave'
import { assertCanvasStateWithinLimit, type PersistedCanvasState } from '@/lib/canvas/state'
import { CanvasToolbar } from './canvas-toolbar'
import { ExcalidrawBoard } from './excalidraw-board'

export function CanvasWorkspace({ canvas }: { canvas: CanvasDetail }) {
  const initialSerialized = useMemo(
    () => assertCanvasStateWithinLimit(canvas.state as PersistedCanvasState),
    [canvas.state]
  )
  const { queueSave, status, isDirty } = useCanvasAutosave(canvas.id, initialSerialized)

  return (
    <div className="space-y-4">
      <CanvasToolbar
        canvasId={canvas.id}
        initialName={canvas.name}
        status={status}
        isDirty={isDirty}
      />
      <ExcalidrawBoard
        initialData={canvas.state as PersistedCanvasState}
        onSnapshotChange={queueSave}
      />
    </div>
  )
}
```

- [ ] **Step 5: Verify end-to-end for this phase**

Run: `node --test lib/navigation.test.ts lib/i18n.test.ts lib/canvas/state.test.ts`

Expected: PASS

Run: `npm run lint`

Expected: PASS

Run: `npm run build`

Expected: PASS

Manual browser check:
1. Log in and confirm the first post-auth route is `/canvas`.
2. Confirm a first-time user gets redirected into `/canvas/<id>` instead of seeing an empty list.
3. Draw one shape in Excalidraw and verify the toolbar changes from idle → saving → saved.
4. Refresh `/canvas/<id>` and confirm the shape persists.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json components/canvas/excalidraw-board.tsx components/canvas/canvas-toolbar.tsx components/canvas/canvas-workspace.tsx hooks/use-canvas-autosave.ts
git commit -m "feat(canvas): add excalidraw workspace with autosave"
```

## Task 5: Phase Review Handoff

**Files:**
- Create: `docs/reviews/p6a-review-request.md`

- [ ] **Step 1: Summarize the phase for Claude Code using the shared template**

```md
# P6A Review Request

## Scope
- Canvas-first routing contract
- Canvas persistence schema and ownership-safe queries
- `/canvas` list/detail routes
- Excalidraw workspace with autosave and dirty indicator

## Files Changed
- middleware.ts
- lib/navigation.ts
- lib/canvas/state.ts
- lib/db/schema.ts
- lib/db/canvas-queries.ts
- app/actions/canvas.ts
- app/(dashboard)/canvas/*
- components/canvas/*

## Verification Already Run
- node --test lib/navigation.test.ts lib/i18n.test.ts lib/canvas/state.test.ts
- npm run lint
- npm run build

## Review Focus
- Ownership enforcement on every canvas read/write
- Autosave error handling and stale-state risks
- Excalidraw bundle/runtime integration in App Router
- Any regressions introduced by moving dashboard home to /canvas
```

- [ ] **Step 2: Pause for review before starting P6B**

Expected: Claude Code review returns either no blocking findings or a list of concrete issues to fix in a follow-up commit before multi-model generation work begins

