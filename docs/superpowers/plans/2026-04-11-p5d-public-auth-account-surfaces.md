# P5D Public, Auth, And Account Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring landing, auth, legal, settings, and upgrade into the same professional product language as the redesigned workbench.

**Architecture:** Reuse the shared tokens and shell foundation from `P5A`, then group non-core workflow surfaces into two clusters: public/access surfaces and logged-in account/commercial surfaces. Preserve each route’s logic and purpose while raising visual continuity, hierarchy, and trust. UI implementation in this plan must apply `frontend-design` using the approved direction: light, calm, product-grade SaaS with stronger structure and restrained polish.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, lucide-react

---

## Dependencies

- Requires `docs/superpowers/plans/2026-04-11-p5a-workbench-foundation.md` to be complete first
- Should not modify create/edit/library files owned by the other lanes

## File Map

- Modify: `app/page.tsx` - keep redirect behavior while landing adopts the new public framing
- Modify: `components/landing/home-page.tsx` - redesign the landing page around clearer value and workbench continuity
- Modify: `app/(auth)/layout.tsx` - replace the plain gradient wrapper with a stronger access shell
- Modify: `app/(auth)/login/page.tsx` - restyle login into a professional access screen
- Modify: `app/(auth)/signup/page.tsx` - align signup with the same access shell and hierarchy
- Modify: `components/legal-page.tsx` - align legal pages with the new public product language
- Modify: `app/(dashboard)/settings/page.tsx` - keep data loading intact while the page adopts stronger context framing
- Modify: `components/settings-form.tsx` - redesign settings into profile, preferences, and security sections with stronger rhythm
- Modify: `app/(dashboard)/upgrade/page.tsx` - improve commercial framing without turning upgrade into a marketing page
- Modify: `components/plan-card.tsx` - align plan cards with the redesign surface language
- Modify: `lib/plans.ts` - only if plan metadata needs lightweight display hints for the upgraded layout

## Task 1: Redesign The Landing And Legal Surfaces

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/landing/home-page.tsx`
- Modify: `components/legal-page.tsx`

- [ ] **Step 1: Keep the home redirect intact while rebuilding the public layout**

```tsx
export default async function Home() {
  const session = await auth()

  if (session?.user) {
    redirect('/generate')
  }

  return <LandingPage />
}
```

- [ ] **Step 2: Rebuild the landing page around value, create/edit clarity, and trust**

```tsx
return (
  <div className="min-h-screen bg-background">
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between rounded-[var(--radius-2xl)] border border-border/70 bg-card/85 px-4 py-3">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/75">
          {dictionary.landing.brand}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Link href="/login" className="rounded-full border border-border/70 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            {dictionary.landing.login}
          </Link>
        </div>
      </header>
      <main className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.86fr)]">
        {/* value statement, create/edit explanation, CTA */}
        {/* preview stack or sample wall that still feels product-grade */}
      </main>
    </div>
  </div>
)
```

- [ ] **Step 3: Align legal pages to the same public system**

```tsx
<div className="min-h-screen bg-background px-4 py-4">
  <div className="mx-auto max-w-5xl rounded-[var(--radius-3xl)] border border-border/75 bg-card/88 p-6">
    <header className="flex items-center justify-between border-b border-border/70 pb-4">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{dictionary.landing.brand}</p>
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">{dictionary.legal.backHome}</Link>
    </header>
    <main className="space-y-6 py-8">{sections.map((section) => <section key={section.title}>{section.title}</section>)}</main>
  </div>
</div>
```

- [ ] **Step 4: Run lint and build**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS and `/`, `/terms`, `/privacy` compile in the new public framing

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/landing/home-page.tsx components/legal-page.tsx
git commit -m "feat(ui): redesign the landing and legal surfaces"
```

## Task 2: Rebuild Login And Signup As Access Screens

**Files:**
- Modify: `app/(auth)/layout.tsx`
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: Upgrade the auth layout shell**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.72fr)]">
        <div className="hidden rounded-[var(--radius-3xl)] border border-border/70 bg-card/85 p-8 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{BRAND_NAME}</p>
            <h1 className="text-4xl font-semibold tracking-tight">{copy.en.landing.workbenchLabel}</h1>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">{copy.en.landing.workbenchDescription}</p>
          </div>
        </div>
        <div className="flex items-center justify-center">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Keep login logic intact while redesigning hierarchy**

```tsx
<Card className="w-full max-w-md border-border/75 bg-card/92">
  <CardHeader className="space-y-2">
    <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">{t.accessHeading}</p>
    <CardTitle className="text-2xl font-semibold tracking-tight">{t.loginTitle}</CardTitle>
    <CardDescription>{t.loginDescription}</CardDescription>
  </CardHeader>
  <form onSubmit={handleSubmit}>
    <CardContent className="space-y-4">
      {error ? <div className="rounded-[var(--radius-xl)] border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      <div className="space-y-2">
        <Label htmlFor="email">{t.emailLabel}</Label>
        <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t.passwordLabel}</Label>
        <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
    </CardContent>
  </form>
</Card>
```

- [ ] **Step 3: Apply the same access-shell treatment to signup**

```tsx
<CardFooter className="flex flex-col gap-4 border-t border-border/70 bg-muted/35">
  <Button type="submit" className="w-full">{loading ? t.signupLoading : t.signupButton}</Button>
  <p className="text-sm text-muted-foreground">{t.hasAccount} <Link href="/login">{t.loginLink}</Link></p>
</CardFooter>
```

- [ ] **Step 4: Run lint and build**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS and `/login` + `/signup` compile in the upgraded auth shell

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/layout.tsx app/(auth)/login/page.tsx app/(auth)/signup/page.tsx
git commit -m "feat(ui): redesign the auth access screens"
```

## Task 3: Turn Settings Into A Proper Account Control Surface

**Files:**
- Modify: `app/(dashboard)/settings/page.tsx`
- Modify: `components/settings-form.tsx`

- [ ] **Step 1: Add stronger page framing without changing the data load**

```tsx
export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const profile = await getUserProfile(session.user.id)
  if (!profile) redirect('/generate')
  return <SettingsForm profile={profile} />
}

// Keep auth() and getUserProfile() exactly as they are.
```

- [ ] **Step 2: Rebuild `SettingsForm` into profile, preferences, and security sections**

```tsx
return (
  <div className="space-y-6">
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{t.pageTitle}</h1>
      <p className="text-sm text-muted-foreground">{t.pageDescription}</p>
    </div>

    <SurfacePanel title={t.profileSection}>
      <Label htmlFor="display-name">{t.nameLabel}</Label>
      <Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      <Button type="button" onClick={handleProfileSave}>{isProfilePending ? t.saving : t.saveButton}</Button>
    </SurfacePanel>
    <SurfacePanel title={t.languageSection}>
      <Select value={selectedLocale} onValueChange={(value) => handleLocaleChange(value as 'zh' | 'en')}>
        <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="zh">中文</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
      </Select>
    </SurfacePanel>
    <SurfacePanel title={t.securitySection}>
      <Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
      <Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
      <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
    </SurfacePanel>
  </div>
)
```

- [ ] **Step 3: Tighten action placement and feedback rhythm**

```tsx
<div className="flex flex-wrap items-center gap-3">
  <Button type="button" onClick={handleProfileSave} disabled={isProfilePending}>{isProfilePending ? t.saving : t.saveButton}</Button>
  <p className="text-xs text-muted-foreground">{profile.email}</p>
</div>
```

- [ ] **Step 4: Run lint and build**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS and `/settings` compiles with the redesigned sections

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/settings/page.tsx components/settings-form.tsx
git commit -m "feat(ui): redesign settings as an account control surface"
```

## Task 4: Redesign Upgrade As A Product-Native Commercial Surface

**Files:**
- Modify: `app/(dashboard)/upgrade/page.tsx`
- Modify: `components/plan-card.tsx`
- Modify: `lib/plans.ts`

- [ ] **Step 1: Add a usage-first page introduction**

```tsx
<section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
  <SurfacePanel title={t.pageTitle} description={t.pageDescription}>
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.contactEmail}</p>
      <div className="grid gap-3 sm:grid-cols-3">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div>
    </div>
  </SurfacePanel>
  <SurfacePanel title={t.usageTitle} description={t.usageDescription}>
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>Free tier usage summary</p>
      <p>Upgrade entry stays inside the product shell.</p>
    </div>
  </SurfacePanel>
</section>
```

- [ ] **Step 2: Rebuild plan cards for calmer comparison**

```tsx
return (
  <Card className="h-full border-border/75 bg-card/92">
    <CardHeader className="space-y-2 text-left">
      <div className="text-sm font-medium text-muted-foreground">{plan.name[locale]}</div>
      <div className="text-3xl font-semibold tracking-tight">{plan.price[locale]}</div>
    </CardHeader>
    <CardContent className="space-y-3">
      <ul className="space-y-2 text-sm text-muted-foreground">
        {plan.features[locale].map((feature) => <li key={feature}>{feature}</li>)}
      </ul>
    </CardContent>
    <CardFooter className="border-t border-border/70 bg-muted/30">
      <Button className="w-full" onClick={handleContact}>{plan.ctaType === 'current' ? t.currentPlan : t.contactUs}</Button>
    </CardFooter>
  </Card>
)
```

- [ ] **Step 3: Keep CTA behavior stable while clarifying plan differences**

```ts
export interface Plan {
  id: string
  name: Record<Locale, string>
  price: Record<Locale, string>
  features: Record<Locale, string[]>
  ctaType: 'current' | 'contact'
  emphasis?: 'default' | 'highlight'
}
```

- [ ] **Step 4: Run lint and build**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS and `/upgrade` compiles with the updated plan cards

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/upgrade/page.tsx components/plan-card.tsx lib/plans.ts
git commit -m "feat(ui): redesign the upgrade surface"
```

## Task 5: Smoke-Check Public And Account Continuity

**Files:**
- Modify: `components/landing/home-page.tsx`
- Modify: `app/(auth)/layout.tsx`
- Modify: `components/settings-form.tsx`
- Modify: `app/(dashboard)/upgrade/page.tsx`

- [ ] **Step 1: Run the automated checks**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Perform the manual continuity pass**

```text
Check public:
- landing clearly explains create + edit and leads into auth
- legal pages share the same visual language as landing
- login and signup feel like access screens, not generic cards

Check logged-in account surfaces:
- settings reads as profile / preferences / security
- upgrade feels product-native, not like a detached marketing page
- typography, spacing, and surface treatments match the workbench
```

- [ ] **Step 3: Apply only continuity fixes**

```tsx
// Restrict the final pass to visual continuity, hierarchy, and CTA emphasis.
// Do not alter create/edit/library behavior in this plan.
```

- [ ] **Step 4: Re-run the build after corrections**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/landing/home-page.tsx app/(auth)/layout.tsx components/settings-form.tsx app/(dashboard)/upgrade/page.tsx
git commit -m "fix(ui): align public and account surfaces with the redesign"
```
