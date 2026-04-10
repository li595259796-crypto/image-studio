# P5C Library Asset Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/gallery` into a calmer, more useful Library surface for browsing, filtering, and re-entering the creation loop.

**Architecture:** Keep the existing gallery actions and image record model, but reorganize the page around a context header, a clearer filter bar, higher-signal asset cards, and a viewer that behaves like an asset detail surface. Limit logic additions to small pure helpers in `lib/gallery.ts` so the UI lane stays testable without introducing a new frontend test stack. UI implementation in this plan must apply `frontend-design` using the approved direction: premium asset management inside the same warm-white SaaS system.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, lucide-react, node:test

---

## Dependencies

- Requires `docs/superpowers/plans/2026-04-11-p5a-workbench-foundation.md` to be complete first
- Must not change shared shell files owned by the foundation lane

## File Map

- Modify: `lib/gallery.ts` - add small pure helpers that power header and empty-state decisions
- Modify: `lib/gallery.test.ts` - cover the new helper behavior
- Modify: `app/(dashboard)/gallery/page.tsx` - replace the current gallery framing with a Library surface
- Modify: `components/gallery-filters.tsx` - redesign filters as a calmer utility bar
- Modify: `components/image-grid.tsx` - support a stronger empty state and denser asset presentation
- Modify: `components/image-card.tsx` - increase metadata clarity and calm action discoverability
- Modify: `components/image-viewer.tsx` - shift from a simple preview dialog to an asset-detail surface
- Create: `components/library/library-header.tsx` - page title, summary, and active filter description
- Create: `components/library/library-empty-state.tsx` - explicit empty and filtered-empty messaging

## Task 1: Add Pure Helpers For Library Header And Empty States

**Files:**
- Modify: `lib/gallery.ts`
- Modify: `lib/gallery.test.ts`

- [ ] **Step 1: Add a failing test for the new helper contract**

```ts
test('returns filtered empty state when filters are active but no images are present', () => {
  assert.deepEqual(
    getLibrarySurfaceState({
      total: 0,
      favoriteOnly: true,
      timeRange: '7d',
    }),
    {
      summaryKind: 'filtered',
      emptyKind: 'filtered',
    }
  )
})
```

- [ ] **Step 2: Run the gallery test file to verify it fails**

Run: `node --test lib/gallery.test.ts`
Expected: FAIL because `getLibrarySurfaceState` does not exist yet

- [ ] **Step 3: Implement the helper in `lib/gallery.ts`**

```ts
export function getLibrarySurfaceState({
  total,
  favoriteOnly,
  timeRange,
}: {
  total: number
  favoriteOnly: boolean
  timeRange: 'all' | 'today' | '7d' | '30d'
}) {
  const hasFilters = favoriteOnly || timeRange !== 'all'

  return {
    summaryKind: hasFilters ? 'filtered' : 'default',
    emptyKind: total === 0 ? (hasFilters ? 'filtered' : 'empty') : 'content',
  } as const
}
```

- [ ] **Step 4: Re-run the gallery tests**

Run: `node --test lib/gallery.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/gallery.ts lib/gallery.test.ts
git commit -m "feat(ui): add library surface helpers"
```

## Task 2: Reframe The Gallery Page As Library

**Files:**
- Create: `components/library/library-header.tsx`
- Create: `components/library/library-empty-state.tsx`
- Modify: `app/(dashboard)/gallery/page.tsx`
- Modify: `components/image-grid.tsx`

- [ ] **Step 1: Add the Library header and empty-state components**

```tsx
export function LibraryHeader({
  title,
  description,
  total,
  summary,
}: {
  title: string
  description: string
  total: number
  summary: string
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-full border border-border/80 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground">
        {summary} · {total}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update the gallery page to consume the new helper and header**

```tsx
const surfaceState = getLibrarySurfaceState({ total, favoriteOnly, timeRange })

return (
  <div className="space-y-6">
    <LibraryHeader
      title="Library"
      description="Review, filter, and reuse your generated assets."
      total={total}
      summary={surfaceState.summaryKind === 'filtered' ? 'Filtered view' : 'All assets'}
    />
    <GalleryFilters
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      favoriteOnly={favoriteOnly}
      onFavoriteToggle={() => setFavoriteOnly((prev) => !prev)}
    />
    <ImageGrid
      images={images}
      loading={isPending}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
      onImageDeleted={handleImageDeleted}
      onFavoriteChanged={handleFavoriteChanged}
      emptyState={
        surfaceState.emptyKind === 'filtered'
          ? <LibraryEmptyState variant="filtered" />
          : <LibraryEmptyState variant="empty" />
      }
    />
  </div>
)
```

- [ ] **Step 3: Teach the grid to render a supplied empty-state component**

```tsx
interface ImageGridProps {
  images: ImageRecord[]
  emptyState?: React.ReactNode
  onLoadMore: () => void
  hasMore: boolean
  loading: boolean
  onImageDeleted?: (imageId: string) => void
  onFavoriteChanged?: (imageId: string, isFavorite: boolean) => void
}
```

- [ ] **Step 4: Run lint and build**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS and `/gallery` compiles with the new Library framing

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/gallery/page.tsx components/image-grid.tsx components/library/library-header.tsx components/library/library-empty-state.tsx
git commit -m "feat(ui): reframe gallery as the library surface"
```

## Task 3: Redesign Filters, Asset Cards, And The Detail Viewer

**Files:**
- Modify: `components/gallery-filters.tsx`
- Modify: `components/image-card.tsx`
- Modify: `components/image-viewer.tsx`

- [ ] **Step 1: Reshape the filter bar into a calmer utility row**

```tsx
return (
  <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-xl)] border border-border/80 bg-card/78 p-2">
    <Select value={timeRange} onValueChange={(value) => onTimeRangeChange(value as TimeRange)}>
      <SelectTrigger className="min-w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t.all}</SelectItem>
        <SelectItem value="today">{t.today}</SelectItem>
        <SelectItem value="7d">{t.last7Days}</SelectItem>
        <SelectItem value="30d">{t.last30Days}</SelectItem>
      </SelectContent>
    </Select>
    <Button variant={favoriteOnly ? 'secondary' : 'ghost'} size="sm">{t.favoritesOnly}</Button>
  </div>
)
```

- [ ] **Step 2: Upgrade the asset card metadata hierarchy**

```tsx
<button className="group flex w-full flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-border/80 bg-card/90 text-left">
  <div className="relative aspect-[4/5] w-full overflow-hidden">
    <Image src={image.blobUrl ?? ''} alt={image.prompt} fill className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
  </div>
  <div className="space-y-3 p-3.5">
    <div className="flex items-center gap-2">
      <Badge variant="secondary">{image.type}</Badge>
      {image.aspectRatio ? <Badge variant="outline">{image.aspectRatio}</Badge> : null}
      <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(image.createdAt.toString())}</span>
    </div>
    <p className="line-clamp-2 text-sm leading-6">{image.prompt}</p>
  </div>
</button>
```

- [ ] **Step 3: Rework the viewer footer into an asset-detail action layout**

```tsx
<DialogFooter className="border-t border-border/70 pt-4">
  <div className="flex flex-wrap gap-2">
    <Button variant="outline" size="sm">Download</Button>
    <Button variant="outline" size="sm">Copy prompt</Button>
    {!isUploadType ? <Button variant="outline" size="sm">Copy to create</Button> : null}
    <Button variant="secondary" size="sm">Continue edit</Button>
    <Button variant="destructive" size="sm">Delete</Button>
  </div>
</DialogFooter>
```

- [ ] **Step 4: Run lint and build**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS with image cards and viewer compiling through the Library page

- [ ] **Step 5: Commit**

```bash
git add components/gallery-filters.tsx components/image-card.tsx components/image-viewer.tsx
git commit -m "feat(ui): redesign the library cards and asset detail viewer"
```

## Task 4: Smoke-Check The Library Loop

**Files:**
- Modify: `app/(dashboard)/gallery/page.tsx`
- Modify: `components/image-grid.tsx`
- Modify: `components/image-card.tsx`
- Modify: `components/image-viewer.tsx`

- [ ] **Step 1: Run the automated checks**

Run: `node --test lib/gallery.test.ts`
Expected: PASS

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Perform the manual Library pass**

```text
Check /gallery:
- header reads as Library even though the route remains /gallery
- filters feel like a utility row, not a separate admin toolbar
- cards surface type, ratio, and date without overwhelming the preview
- empty state changes when filters are active
- viewer actions support download, favorite, reuse, and continue edit
```

- [ ] **Step 3: Apply Library-only fixes**

```tsx
// Keep the final pass scoped to Library framing, card density, dialog hierarchy, and filter clarity.
// Do not edit Create/Edit or public/account files in this plan.
```

- [ ] **Step 4: Re-run the build after corrections**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/gallery/page.tsx components/image-grid.tsx components/image-card.tsx components/image-viewer.tsx
git commit -m "fix(ui): stabilize the library asset center"
```
