# P5A Workbench Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared design foundation for the redesign: tokens, copy contracts, authenticated workbench shell, and reusable visual primitives that every later frontend lane depends on.

**Architecture:** Centralize new redesign copy and visual tokens first, then replace the current top-nav dashboard wrapper with a sidebar-driven workbench shell. Keep shared logic in `app/globals.css`, `lib/i18n.ts`, and new `components/workbench/*` primitives so downstream page lanes can work with stable, low-conflict interfaces. UI implementation in this plan must apply `frontend-design` using the approved direction: calm, precise, high-end SaaS with warm-white surfaces and controlled cool accents.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, lucide-react, node:test

---

## File Map

- Modify: `app/globals.css` - global color tokens, radii, shell surfaces, typography defaults, sidebar tokens
- Modify: `app/layout.tsx` - root body classes and global shell-ready body structure
- Modify: `app/(dashboard)/layout.tsx` - swap the current top-nav layout for the new workbench shell entry point
- Modify: `components/nav-bar.tsx` - shrink or retire into shell-specific pieces without breaking current props
- Modify: `components/quota-badge.tsx` - convert quota from floating badge behavior to shell usage module behavior
- Modify: `components/language-toggle.tsx` - adapt the toggle for both shell and public placements
- Modify: `components/ui/button.tsx` - tighten button density and state language for the redesign
- Modify: `components/ui/card.tsx` - align cards/panels with the new product surface language
- Modify: `components/ui/input.tsx` - align input density, borders, and focus treatment
- Modify: `components/ui/textarea.tsx` - match textarea treatment to the new input system
- Modify: `lib/i18n.ts` - add all redesign copy keys needed by later lanes so downstream plans avoid editing shared dictionary shape
- Modify: `lib/i18n.test.ts` - lock the new dictionary contract
- Create: `components/workbench/dashboard-shell.tsx` - orchestrates sidebar, top context bar, content slot, and account/usage region
- Create: `components/workbench/sidebar-nav.tsx` - authenticated primary and secondary navigation
- Create: `components/workbench/top-context-bar.tsx` - page title, description, page-local actions, mobile menu trigger
- Create: `components/workbench/surface-panel.tsx` - shared panel wrapper for later lanes

## Task 1: Lock The Redesign Copy Contract

**Files:**
- Modify: `lib/i18n.ts`
- Modify: `lib/i18n.test.ts`

- [ ] **Step 1: Write the failing dictionary contract test**

```ts
test('exposes redesign copy for workbench, library, public, and account surfaces', () => {
  for (const locale of locales) {
    assert.ok(copy[locale].nav.generate)
    assert.ok(copy[locale].nav.edit)
    assert.ok(copy[locale].nav.gallery)
    assert.ok(copy[locale].gallery.libraryTitle)
    assert.ok(copy[locale].gallery.libraryDescription)
    assert.ok(copy[locale].settings.pageDescription)
    assert.ok(copy[locale].upgrade.usageTitle)
    assert.ok(copy[locale].auth.accessHeading)
    assert.ok(copy[locale].landing.valuePill)
  }
})
```

- [ ] **Step 2: Run the dictionary test to verify it fails**

Run: `node --test lib/i18n.test.ts`
Expected: FAIL with missing redesign keys such as `gallery.libraryTitle` or `auth.accessHeading`

- [ ] **Step 3: Extend the dictionary shape and both locale payloads**

```ts
interface LocaleCopy {
  landing: {
    brand: string
    eyebrow: string
    headline: string
    subheading: string
    cta: string
    login: string
    samplesLabel: string
    samples: string[]
    sampleAltPrefix: string
    valuePill: string
    workbenchLabel: string
    workbenchDescription: string
  }
  auth: {
    accessHeading: string
    accessSupport: string
    loginTitle: string
    loginDescription: string
    signupTitle: string
    signupDescription: string
  }
  gallery: {
    libraryTitle: string
    libraryDescription: string
    emptyTitle: string
    emptyDescription: string
    filteredEmptyTitle: string
    filteredEmptyDescription: string
    copyToGenerate: string
    copyPrompt: string
    continueEdit: string
  }
  settings: {
    pageTitle: string
    pageDescription: string
    profileSection: string
  }
  upgrade: {
    pageTitle: string
    pageDescription: string
    usageTitle: string
    usageDescription: string
    currentPlan: string
  }
}
```

- [ ] **Step 4: Re-run the dictionary contract test**

Run: `node --test lib/i18n.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/i18n.ts lib/i18n.test.ts
git commit -m "feat(ui): lock redesign copy contract"
```

## Task 2: Establish Global Tokens And Shared Surface Styling

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `components/ui/button.tsx`
- Modify: `components/ui/card.tsx`
- Modify: `components/ui/input.tsx`
- Modify: `components/ui/textarea.tsx`
- Create: `components/workbench/surface-panel.tsx`

- [ ] **Step 1: Add the foundation token changes**

```css
:root {
  --background: oklch(0.985 0.008 85);
  --foreground: oklch(0.19 0.01 255);
  --card: oklch(0.995 0.004 85);
  --muted: oklch(0.965 0.006 85);
  --border: oklch(0.91 0.008 255);
  --ring: oklch(0.62 0.05 240);
  --sidebar: oklch(0.965 0.006 85);
  --sidebar-accent: oklch(0.94 0.01 245);
  --radius: 0.85rem;
}

body {
  min-height: 100%;
  background:
    radial-gradient(circle at top, color-mix(in oklab, var(--background), white 45%), transparent 32%),
    linear-gradient(180deg, color-mix(in oklab, var(--background), white 18%), var(--background));
}
```

- [ ] **Step 2: Tighten the shared primitives before shell work begins**

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.3)_inset]",
        outline: "border-border bg-card hover:bg-muted/75",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/85",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
      },
    },
  }
)
```

- [ ] **Step 3: Add a reusable surface wrapper for later page lanes**

```tsx
export function SurfacePanel({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[var(--radius-2xl)] border border-border/80 bg-card/92 p-5 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset]">
      {(title || description) && (
        <header className="mb-4 space-y-1">
          {title ? <h2 className="text-sm font-semibold tracking-tight">{title}</h2> : null}
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </header>
      )}
      {children}
    </section>
  )
}
```

- [ ] **Step 4: Run lint and build to verify the shared layer**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS with Next.js production build completing successfully

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx components/ui/button.tsx components/ui/card.tsx components/ui/input.tsx components/ui/textarea.tsx components/workbench/surface-panel.tsx
git commit -m "feat(ui): add redesign tokens and shared surface primitives"
```

## Task 3: Replace The Dashboard Wrapper With A Sidebar Workbench Shell

**Files:**
- Create: `components/workbench/dashboard-shell.tsx`
- Create: `components/workbench/sidebar-nav.tsx`
- Create: `components/workbench/top-context-bar.tsx`
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `components/nav-bar.tsx`
- Modify: `components/quota-badge.tsx`
- Modify: `components/language-toggle.tsx`

- [ ] **Step 1: Define the shell interfaces before implementing the layout**

```tsx
export interface WorkbenchNavItem {
  href: '/generate' | '/edit' | '/gallery' | '/settings' | '/upgrade'
  label: string
  icon: LucideIcon
  group: 'primary' | 'secondary'
}

export interface DashboardShellProps {
  user: { email: string; displayName?: string; avatarUrl?: string }
  quota: { dailyUsed: number; dailyLimit: number }
  localeControl: React.ReactNode
  children: React.ReactNode
}
```

- [ ] **Step 2: Implement the sidebar, context bar, and shell composition**

```tsx
export function DashboardShell(props: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarNav user={props.user} quota={props.quota} localeControl={props.localeControl} />
        <div className="min-w-0 border-l border-border/70 bg-background/70 backdrop-blur">
          <TopContextBar />
          <main className="px-4 py-4 sm:px-6 lg:px-8">{props.children}</main>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire the new shell into the dashboard layout**

```tsx
return (
  <div className="min-h-screen">
    <LocaleSync locale={dbLocale} />
    <DashboardShell
      user={userInfo}
      quota={quota}
      localeControl={<LanguageToggle onPersist={updateLocaleAction} />}
    >
      {children}
    </DashboardShell>
  </div>
)
```

- [ ] **Step 4: Run lint and build against the new shell**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS and `/generate`, `/edit`, `/gallery`, `/settings`, `/upgrade` compile through the shared shell

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/layout.tsx components/nav-bar.tsx components/quota-badge.tsx components/language-toggle.tsx components/workbench/dashboard-shell.tsx components/workbench/sidebar-nav.tsx components/workbench/top-context-bar.tsx
git commit -m "feat(ui): add sidebar-driven workbench shell"
```

## Task 4: Smoke-Check The Shared Foundation

**Files:**
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `components/workbench/dashboard-shell.tsx`
- Modify: `components/workbench/sidebar-nav.tsx`
- Modify: `components/workbench/top-context-bar.tsx`

- [ ] **Step 1: Run the focused automated checks**

Run: `node --test lib/i18n.test.ts`
Expected: PASS

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Perform the manual shell smoke pass**

```text
Check /generate on desktop:
- sidebar shows Create / Edit / Library as the only primary destinations
- quota lives in the lower shell area instead of floating beside the old top nav
- page content sits under a thin context header, not a full-width nav row

Check /generate on mobile:
- shell does not force horizontal scrolling
- menu trigger is reachable
- primary content remains visible before account utilities
```

- [ ] **Step 3: Apply any final shell-only corrections**

```tsx
// Keep shell fixes limited to spacing, overflow, active states, and focus treatment.
// Do not start redesigning page-specific content in this plan.
```

- [ ] **Step 4: Re-run the build after corrections**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/layout.tsx components/workbench/dashboard-shell.tsx components/workbench/sidebar-nav.tsx components/workbench/top-context-bar.tsx
git commit -m "fix(ui): stabilize redesign foundation shell"
```
