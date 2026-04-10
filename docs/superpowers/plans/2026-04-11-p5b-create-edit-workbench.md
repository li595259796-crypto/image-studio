# P5B Create/Edit Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/generate` and `/edit` into a consistent, two-panel professional workbench without changing the existing backend action contracts.

**Architecture:** Reuse the shell and tokens from `P5A`, then introduce shared workbench content primitives for prompt/source input on the left and result feedback on the right. Keep all existing action calls (`generateImageAction`, `editImageAction`) intact while reorganizing page hierarchy, result presentation, and scenario/template entry points. UI implementation in this plan must apply `frontend-design` using the approved direction: restrained, high-confidence creative SaaS with clear left/right task separation.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, lucide-react

---

## Dependencies

- Requires `docs/superpowers/plans/2026-04-11-p5a-workbench-foundation.md` to be complete first
- Must not modify `app/globals.css` or `lib/i18n.ts` except for narrowly scoped bug fixes after the foundation lane lands

## File Map

- Modify: `app/(dashboard)/generate/page.tsx` - keep route stable while switching to the new workbench presentation
- Modify: `app/(dashboard)/edit/page.tsx` - match edit route framing to generate
- Modify: `components/generate-page-client.tsx` - promote generate to the logged-in home workbench
- Modify: `components/generate-form.tsx` - convert freeform generation into a dedicated left-panel composer
- Modify: `components/scenario-grid.tsx` - turn scenarios into shortcut tiles rather than the whole page mode
- Modify: `components/scenario-form.tsx` - align guided scenarios with the same left/right workbench pattern
- Modify: `components/edit-form.tsx` - redesign upload + prompt into a stable source tray and action panel
- Modify: `components/post-actions.tsx` - restyle and regroup result actions as a result rail
- Create: `components/workbench/workbench-content.tsx` - shared two-panel content grid for create/edit pages
- Create: `components/workbench/result-panel.tsx` - shared result surface for empty/loading/success/error states
- Create: `components/workbench/panel-section.tsx` - shared section wrapper used inside prompt/source/action columns

## Task 1: Add Shared Create/Edit Content Primitives

**Files:**
- Create: `components/workbench/workbench-content.tsx`
- Create: `components/workbench/result-panel.tsx`
- Create: `components/workbench/panel-section.tsx`

- [ ] **Step 1: Add the workbench content scaffold**

```tsx
export function WorkbenchContent({
  left,
  right,
}: {
  left: React.ReactNode
  right: React.ReactNode
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <div className="space-y-5">{left}</div>
      <div className="space-y-5">{right}</div>
    </div>
  )
}
```

- [ ] **Step 2: Add a result panel that owns empty, pending, success, and error states**

```tsx
export function ResultPanel({
  title,
  description,
  pending,
  error,
  imageUrl,
  actions,
}: {
  title: string
  description: string
  pending?: boolean
  error?: string | null
  imageUrl?: string
  actions?: React.ReactNode
}) {
  if (pending) {
    return (
      <SurfacePanel title={title} description={description}>
        <div className="space-y-3">
          <Skeleton className="aspect-[4/5] w-full rounded-[var(--radius-xl)]" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </SurfacePanel>
    )
  }

  if (error) {
    return (
      <SurfacePanel title={title} description={description}>
        <div className="rounded-[var(--radius-xl)] border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </SurfacePanel>
    )
  }

  if (imageUrl) {
    return (
      <SurfacePanel title={title} description={description}>
        <img src={imageUrl} alt={title} className="w-full rounded-[var(--radius-xl)] object-contain" />
        {actions ? <div className="mt-4">{actions}</div> : null}
      </SurfacePanel>
    )
  }

  return (
    <SurfacePanel title={title} description={description}>
      <div className="flex min-h-[420px] items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border/80 bg-muted/35 p-6 text-sm text-muted-foreground">
        Results will appear here after you run a generation or edit.
      </div>
    </SurfacePanel>
  )
}
```

- [ ] **Step 3: Add a small section wrapper for repeated input groups**

```tsx
export function PanelSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <SurfacePanel title={title} description={description}>
      <div className="space-y-4">{children}</div>
    </SurfacePanel>
  )
}
```

- [ ] **Step 4: Run lint to verify the new shared components**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/workbench/workbench-content.tsx components/workbench/result-panel.tsx components/workbench/panel-section.tsx
git commit -m "feat(ui): add create/edit workbench content primitives"
```

## Task 2: Promote Generate Into The Primary Creation Workbench

**Files:**
- Modify: `app/(dashboard)/generate/page.tsx`
- Modify: `components/generate-page-client.tsx`
- Modify: `components/scenario-grid.tsx`

- [ ] **Step 1: Reframe the generate page so it starts in workbench mode**

```tsx
export default function GeneratePage() {
  return <GeneratePageClient />
}

// GeneratePageClient should render:
// - page intro in the context-aware body area
// - shortcut scenarios as supporting UI, not the entire page
// - the freeform creation path as the default visible state
```

- [ ] **Step 2: Reduce scenario tiles into shortcut cards instead of the whole screen**

```tsx
export function ScenarioGrid({ onSelect }: ScenarioGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {scenarios.map((scenario) => (
        <button
          key={scenario.id}
          className="rounded-[var(--radius-xl)] border border-border/80 bg-card/85 p-4 text-left hover:border-ring/40"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-2xl">{scenario.icon}</span>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{scenarioI18n[scenario.id].name}</p>
              <p className="text-xs leading-5 text-muted-foreground">{scenarioI18n[scenario.id].subtitle}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Keep URL-driven freeform support while defaulting to the workbench**

```tsx
if (searchParams.get('mode') === 'freeform') {
  setSelectedScenario('freeform')
}

const showWorkbench = selectedScenario === null || selectedScenario === 'freeform'
```

- [ ] **Step 4: Run lint and build**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS and `/generate` compiles in the new workbench framing

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/generate/page.tsx components/generate-page-client.tsx components/scenario-grid.tsx
git commit -m "feat(ui): promote generate to the primary creation workbench"
```

## Task 3: Convert Freeform And Guided Generation To The Two-Panel Pattern

**Files:**
- Modify: `components/generate-form.tsx`
- Modify: `components/scenario-form.tsx`
- Modify: `components/post-actions.tsx`
- Modify: `components/workbench/result-panel.tsx`

- [ ] **Step 1: Move generate form inputs into explicit Intent, Controls, and Action sections**

```tsx
<WorkbenchContent
  left={
    <>
      <PanelSection title="Intent" description="Describe the image you want to create.">
        <Textarea
          id="prompt"
          name="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the image you want to create..."
          className="min-h-40 resize-none"
          disabled={isPending}
        />
        <RefineDialog scenarioId="freeform" currentDescription={prompt} onApply={(refined) => setPrompt(refined)} />
      </PanelSection>
      <PanelSection title="Controls" description="Tune the frame and output quality.">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">{aspectRatios.map((ratio) => <Button key={ratio} type="button">{ratio}</Button>)}</div>
          <div className="flex flex-wrap gap-2">{qualities.map((qualityOption) => <Button key={qualityOption} type="button">{qualityOption}</Button>)}</div>
        </div>
      </PanelSection>
      <PanelSection title="Action">
        <Button type="submit" size="lg" className="w-full gap-2">{isPending ? t.generatingButton : t.generateButton}</Button>
      </PanelSection>
    </>
  }
  right={
    <ResultPanel
      title="Result"
      description="Your latest generation will render here."
      pending={isPending}
      error={errorMessage}
      imageUrl={result?.blobUrl}
      actions={
        result ? (
          <PostActions
            imageUrl={result.blobUrl}
            imageId={result.imageId}
            prompt={prompt}
            isUploadType={false}
            editIntent={freeformScenario.editIntent}
            onRetry={handleRetry}
            retrying={isPending}
          />
        ) : null
      }
    />
  }
/>
```

- [ ] **Step 2: Apply the same result ownership to guided scenario flows**

```tsx
const builtPrompt = buildPrompt(scenario, description, selectedStyle)

<ResultPanel
  title={t.resultTitle}
  description={t.resultDescription}
  pending={isPending}
  error={errorMessage}
  imageUrl={result?.blobUrl}
  actions={
    result ? (
      <PostActions
        imageUrl={result.blobUrl}
        imageId={result.imageId}
        prompt={builtPrompt}
        isUploadType={isUpload}
        editIntent={scenario.editIntent}
        onRetry={handleRetry}
      />
    ) : null
  }
/>
```

- [ ] **Step 3: Restyle `PostActions` as a dedicated result rail**

```tsx
return (
  <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
    <Button variant="outline" size="sm">{t.download}</Button>
    <Button variant="outline" size="sm">{t.copyPrompt}</Button>
    <Button variant="secondary" size="sm">{t.continueEdit}</Button>
    <Button variant="ghost" size="sm">{isUploadType ? t.retryWithSource : t.retry}</Button>
  </div>
)
```

- [ ] **Step 4: Run lint and build**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS with freeform and guided generation compiling through the shared two-panel content

- [ ] **Step 5: Commit**

```bash
git add components/generate-form.tsx components/scenario-form.tsx components/post-actions.tsx components/workbench/result-panel.tsx
git commit -m "feat(ui): redesign generate flows into a two-panel workbench"
```

## Task 4: Redesign Edit Into The Same Workbench Grammar

**Files:**
- Modify: `app/(dashboard)/edit/page.tsx`
- Modify: `components/edit-form.tsx`
- Modify: `components/post-actions.tsx`

- [ ] **Step 1: Update the edit route framing**

```tsx
export default function EditPage() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Edit</h1>
        <p className="text-sm text-muted-foreground">Bring source images into a controlled editing workspace.</p>
      </div>
      <EditForm />
    </div>
  )
}
```

- [ ] **Step 2: Rebuild the edit form into Source, Intent, and Action sections**

```tsx
<WorkbenchContent
  left={
    <>
      <PanelSection title="Source" description="Add one or two source images.">
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className="flex min-h-40 items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border/80 bg-muted/25">
            Primary image
          </button>
          <button type="button" className="flex min-h-40 items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-border/80 bg-muted/25">
            Secondary image
          </button>
        </div>
      </PanelSection>
      <PanelSection title="Intent" description="Describe what should change while preserving the subject.">
        <Textarea
          id="edit-prompt"
          name="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe the edits you want to make..."
          className="min-h-36 resize-none"
          disabled={isPending}
        />
      </PanelSection>
      <PanelSection title="Action">
        <Button type="submit" size="lg" className="w-full gap-2">{isPending ? 'Editing...' : 'Edit'}</Button>
      </PanelSection>
    </>
  }
  right={
    <ResultPanel
      title="Result"
      description={sourceHint}
      pending={isPending}
      error={errorMessage}
      imageUrl={result?.blobUrl}
      actions={
        result ? (
          <PostActions
            imageUrl={result.blobUrl}
            imageId={result.imageId}
            prompt={prompt}
            isUploadType
            editIntent="Preserve the subject while refining the scene."
            onRetry={handleRetry}
            retrying={isPending}
          />
        ) : null
      }
    />
  }
/>
```

- [ ] **Step 3: Preserve preload and retry behavior while improving the visual source context**

```tsx
const sourceHint = searchParams.get('sourceUrl')
  ? 'Editing from an existing library asset.'
  : 'Upload a fresh image to begin.'
```

- [ ] **Step 4: Run lint and build**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS and `/edit` renders through the shared workbench content pattern

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/edit/page.tsx components/edit-form.tsx components/post-actions.tsx
git commit -m "feat(ui): redesign edit into the shared workbench layout"
```

## Task 5: Smoke-Check The Core Creation Loop

**Files:**
- Modify: `components/generate-form.tsx`
- Modify: `components/scenario-form.tsx`
- Modify: `components/edit-form.tsx`
- Modify: `components/post-actions.tsx`

- [ ] **Step 1: Run the automated checks**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Perform the manual workbench pass**

```text
Check /generate:
- freeform composer is visible without picking a scenario first
- scenario cards feel like supporting shortcuts, not the whole page
- pending, success, and error states live in the right result panel

Check /edit:
- source tray clearly supports one or two images
- result panel mirrors generate
- retry and continue-edit actions still work
```

- [ ] **Step 3: Apply core-loop-only corrections**

```tsx
// Restrict final fixes to layout rhythm, result ownership, and action grouping.
// Do not redesign Library or public/account pages in this plan.
```

- [ ] **Step 4: Re-run the build after corrections**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/generate-form.tsx components/scenario-form.tsx components/edit-form.tsx components/post-actions.tsx
git commit -m "fix(ui): stabilize the create and edit workbench"
```
