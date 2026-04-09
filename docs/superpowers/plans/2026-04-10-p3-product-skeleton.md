# P3: Product Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unified error handling, locale persistence, account settings, upgrade page, and Gallery favorites/filters — transforming the app from feature prototype into a cohesive product.

**Architecture:** Phase 1 lays infrastructure (structured errors, locale DB sync, profile from DB, NavBar entries). Phase 2 builds features on top (settings page, upgrade page, Gallery enhancements). Root layout stays untouched; DB locale syncs via a `<LocaleSync>` client component inside dashboard layout.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, shadcn/ui, Tailwind CSS 4, Drizzle ORM + Vercel Postgres, Vercel Blob, sonner, bcryptjs

**Spec:** `docs/superpowers/specs/2026-04-10-p3-product-skeleton-design.md`

---

## Phase 1: Infrastructure

### Task 1: Extend ActionResult + Create Error Toast Utility

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/error-toast.ts`

- [ ] **Step 1: Extend ActionResult type**

In `lib/types.ts`, replace the `ActionResult` interface:

```typescript
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errorCode?: 'quota_exceeded' | 'auth_required' | 'validation_error'
  quota?: {
    dailyUsed: number
    dailyLimit: number
    monthlyUsed: number
    monthlyLimit: number
  }
}
```

- [ ] **Step 2: Create error toast utility**

Create `lib/error-toast.ts`:

```typescript
import { toast } from 'sonner'
import type { Locale } from '@/lib/i18n'

interface QuotaPayload {
  dailyUsed: number
  dailyLimit: number
  monthlyUsed: number
  monthlyLimit: number
}

const messages: Record<Locale, { title: string; cta: string }> = {
  zh: { title: '今日额度已用完', cta: '查看升级方案 →' },
  en: { title: 'Daily quota exceeded', cta: 'View upgrade plans →' },
}

export function showError(message: string): void {
  toast.error(message)
}

export function showQuotaError(locale: Locale, quota: QuotaPayload): void {
  const t = messages[locale]
  toast.error(t.title, {
    id: 'quota-exceeded',
    description: `${locale === 'zh' ? '日' : 'Daily'}: ${quota.dailyUsed}/${quota.dailyLimit}  ${locale === 'zh' ? '月' : 'Monthly'}: ${quota.monthlyUsed}/${quota.monthlyLimit}`,
    action: {
      label: t.cta,
      onClick: () => { window.location.href = '/upgrade' },
    },
    duration: 8000,
  })
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -10`

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/error-toast.ts
git commit -m "feat(p3): add structured ActionResult error codes and unified error toast"
```

---

### Task 2: i18n Translations for P3

**Files:**
- Modify: `lib/i18n.ts`

- [ ] **Step 1: Add new sections to LocaleCopy interface**

After the existing `gallery` field in the `LocaleCopy` interface, add:

```typescript
  settings: {
    pageTitle: string
    profileSection: string
    nameLabel: string
    namePlaceholder: string
    avatarLabel: string
    avatarUpload: string
    saveButton: string
    saving: string
    languageSection: string
    languageLabel: string
    securitySection: string
    currentPassword: string
    newPassword: string
    confirmPassword: string
    changePasswordButton: string
    changingPassword: string
    profileSuccess: string
    passwordSuccess: string
    passwordMismatch: string
    passwordTooShort: string
    currentPasswordWrong: string
    localeSuccess: string
    localeFailed: string
  }
  upgrade: {
    pageTitle: string
    pageDescription: string
    currentPlan: string
    contactUs: string
    contactEmail: string
    perMonth: string
    perDay: string
    features: {
      dailyQuota: string
      monthlyQuota: string
      allScenarios: string
      fourK: string
      priorityQueue: string
      basicScenarios: string
    }
  }
  galleryFilter: {
    all: string
    today: string
    last7Days: string
    last30Days: string
    favoritesOnly: string
    timeRange: string
  }
```

Also add to the existing `nav` interface:

```typescript
    settings: string
    upgrade: string
```

- [ ] **Step 2: Add Chinese translations**

In the `zh` object, add to `nav`:

```typescript
      settings: '账户设置',
      upgrade: '升级方案',
```

Then add the new sections after `gallery`:

```typescript
    settings: {
      pageTitle: '账户设置',
      profileSection: '基本信息',
      nameLabel: '昵称',
      namePlaceholder: '输入昵称',
      avatarLabel: '头像',
      avatarUpload: '上传新头像',
      saveButton: '保存',
      saving: '保存中...',
      languageSection: '语言偏好',
      languageLabel: '语言',
      securitySection: '安全',
      currentPassword: '当前密码',
      newPassword: '新密码',
      confirmPassword: '确认密码',
      changePasswordButton: '修改密码',
      changingPassword: '修改中...',
      profileSuccess: '个人信息已更新',
      passwordSuccess: '密码已修改',
      passwordMismatch: '两次密码不一致',
      passwordTooShort: '密码至少 8 位',
      currentPasswordWrong: '当前密码错误',
      localeSuccess: '语言偏好已保存',
      localeFailed: '语言切换失败',
    },
    upgrade: {
      pageTitle: '升级方案',
      pageDescription: '解锁更多创作额度',
      currentPlan: '当前方案',
      contactUs: '联系我们',
      contactEmail: '升级咨询：support@image-studio.site',
      perMonth: '/月',
      perDay: '次/日',
      features: {
        dailyQuota: '次/日',
        monthlyQuota: '次/月',
        allScenarios: '全部场景',
        fourK: '4K 质量',
        priorityQueue: '优先队列',
        basicScenarios: '基础场景',
      },
    },
    galleryFilter: {
      all: '全部',
      today: '今天',
      last7Days: '最近 7 天',
      last30Days: '最近 30 天',
      favoritesOnly: '仅收藏',
      timeRange: '时间范围',
    },
```

- [ ] **Step 3: Add English translations**

Same structure in the `en` object. Add to `nav`:

```typescript
      settings: 'Settings',
      upgrade: 'Upgrade',
```

Then add sections after `gallery`:

```typescript
    settings: {
      pageTitle: 'Account Settings',
      profileSection: 'Profile',
      nameLabel: 'Display Name',
      namePlaceholder: 'Enter display name',
      avatarLabel: 'Avatar',
      avatarUpload: 'Upload new avatar',
      saveButton: 'Save',
      saving: 'Saving...',
      languageSection: 'Language',
      languageLabel: 'Language',
      securitySection: 'Security',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      changePasswordButton: 'Change Password',
      changingPassword: 'Changing...',
      profileSuccess: 'Profile updated',
      passwordSuccess: 'Password changed',
      passwordMismatch: 'Passwords do not match.',
      passwordTooShort: 'Password must be at least 8 characters.',
      currentPasswordWrong: 'Current password is incorrect.',
      localeSuccess: 'Language preference saved',
      localeFailed: 'Language switch failed',
    },
    upgrade: {
      pageTitle: 'Upgrade Plans',
      pageDescription: 'Unlock more creative credits',
      currentPlan: 'Current Plan',
      contactUs: 'Contact Us',
      contactEmail: 'Upgrade inquiries: support@image-studio.site',
      perMonth: '/mo',
      perDay: '/day',
      features: {
        dailyQuota: '/day',
        monthlyQuota: '/month',
        allScenarios: 'All scenarios',
        fourK: '4K quality',
        priorityQueue: 'Priority queue',
        basicScenarios: 'Basic scenarios',
      },
    },
    galleryFilter: {
      all: 'All',
      today: 'Today',
      last7Days: 'Last 7 days',
      last30Days: 'Last 30 days',
      favoritesOnly: 'Favorites only',
      timeRange: 'Time range',
    },
```

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -10`

- [ ] **Step 5: Commit**

```bash
git add lib/i18n.ts
git commit -m "feat(p3): add i18n translations for settings, upgrade, gallery filters"
```

---

### Task 3: DB Schema Migration — users.locale

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add locale column to users table**

In `lib/db/schema.ts`, in the `users` table definition, after the `monthlyQuota` line, add:

```typescript
  locale: text('locale').default('zh').notNull(),
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -10`

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(p3): add locale column to users table schema"
```

**Note for deployer:** Run `npx drizzle-kit push` or the equivalent migration command to apply the schema change to the database.

---

### Task 4: getUserProfile Query + updateLocale Action

**Files:**
- Modify: `lib/db/queries.ts`
- Create: `app/actions/settings.ts`

- [ ] **Step 1: Add getUserProfile to queries**

In `lib/db/queries.ts`, add after the existing `getUserById` function:

```typescript
export async function getUserProfile(userId: string) {
  const result = await db
    .select({
      name: users.name,
      email: users.email,
      image: users.image,
      locale: users.locale,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return result[0] ?? null
}

export async function updateUserLocale(userId: string, locale: string) {
  await db.update(users).set({ locale }).where(eq(users.id, userId))
}
```

- [ ] **Step 2: Create settings server action**

Create `app/actions/settings.ts`:

```typescript
'use server'

import { auth } from '@/lib/auth'
import { updateUserLocale } from '@/lib/db/queries'
import type { ActionResult } from '@/lib/types'

export async function updateLocaleAction(
  locale: string
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    if (locale !== 'zh' && locale !== 'en') {
      return { success: false, error: 'Invalid locale', errorCode: 'validation_error' }
    }

    await updateUserLocale(session.user.id, locale)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update locale' }
  }
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -10`

- [ ] **Step 4: Commit**

```bash
git add lib/db/queries.ts app/actions/settings.ts
git commit -m "feat(p3): add getUserProfile query and updateLocale server action"
```

---

### Task 5: Server Actions Return Structured Quota Errors

**Files:**
- Modify: `app/actions/generate.ts`
- Modify: `app/actions/edit.ts`

- [ ] **Step 1: Update generateImageAction quota error**

In `app/actions/generate.ts`, find the quota check block (around line 46-52). Replace:

```typescript
    const quota = await checkQuota(session.user.id)
    if (!quota.allowed) {
      return {
        success: false,
        error: `Quota exceeded. Daily: ${quota.dailyUsed}/${quota.dailyLimit}, Monthly: ${quota.monthlyUsed}/${quota.monthlyLimit}`,
      }
    }
```

With:

```typescript
    const quota = await checkQuota(session.user.id)
    if (!quota.allowed) {
      return {
        success: false,
        error: 'Quota exceeded',
        errorCode: 'quota_exceeded' as const,
        quota: {
          dailyUsed: quota.dailyUsed,
          dailyLimit: quota.dailyLimit,
          monthlyUsed: quota.monthlyUsed,
          monthlyLimit: quota.monthlyLimit,
        },
      }
    }
```

- [ ] **Step 2: Update editImageAction quota error**

In `app/actions/edit.ts`, find the same quota check block (around line 64-70). Apply the identical replacement.

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -10`

- [ ] **Step 4: Commit**

```bash
git add app/actions/generate.ts app/actions/edit.ts
git commit -m "feat(p3): return structured quota errors from generate and edit actions"
```

---

### Task 6: LocaleSync Component

**Files:**
- Create: `components/locale-sync.tsx`

- [ ] **Step 1: Create LocaleSync**

```typescript
// components/locale-sync.tsx
'use client'

import { useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import type { Locale } from '@/lib/i18n'

interface LocaleSyncProps {
  locale: Locale
}

export function LocaleSync({ locale }: LocaleSyncProps) {
  const { locale: current, setLocale } = useLocale()

  useEffect(() => {
    if (locale && locale !== current) {
      setLocale(locale)
    }
  }, [locale, current, setLocale])

  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add components/locale-sync.tsx
git commit -m "feat(p3): add LocaleSync component for DB locale hydration"
```

---

### Task 7: Dashboard Layout — Profile from DB + LocaleSync

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Rewrite dashboard layout**

Replace the full content of `app/(dashboard)/layout.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getQuotaInfo, getUserProfile } from '@/lib/db/queries'
import { NavBar } from '@/components/nav-bar'
import { LocaleSync } from '@/components/locale-sync'
import type { Locale } from '@/lib/i18n'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const userId = session.user.id!

  let quota = { dailyUsed: 0, dailyLimit: 10 }
  try {
    const quotaInfo = await getQuotaInfo(userId)
    quota = { dailyUsed: quotaInfo.dailyUsed, dailyLimit: quotaInfo.dailyLimit }
  } catch {
    // Fall back to defaults if quota check fails
  }

  const profile = await getUserProfile(userId)

  const userInfo = {
    email: profile?.email ?? session.user.email ?? '',
    displayName: profile?.name ?? undefined,
  }

  const dbLocale = (profile?.locale as Locale) ?? 'zh'

  return (
    <div className="flex min-h-screen flex-col">
      <LocaleSync locale={dbLocale} />
      <NavBar user={userInfo} quota={quota} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -10`

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/layout.tsx
git commit -m "feat(p3): dashboard layout reads profile from DB + renders LocaleSync"
```

---

### Task 8: LanguageToggle Dual-Mode

**Files:**
- Modify: `components/language-toggle.tsx`

- [ ] **Step 1: Add onPersist prop and dual-mode behavior**

Replace the full content of `components/language-toggle.tsx`:

```typescript
'use client'

import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLocale } from '@/components/locale-provider'
import type { Locale } from '@/lib/i18n'

interface LanguageToggleProps {
  className?: string
  onPersist?: (locale: Locale) => Promise<unknown>
}

export function LanguageToggle({ className, onPersist }: LanguageToggleProps) {
  const { locale, setLocale, dictionary } = useLocale()

  function handleSwitch(newLocale: Locale) {
    if (newLocale === locale) return
    const prev = locale
    setLocale(newLocale)

    if (onPersist) {
      onPersist(newLocale).catch(() => {
        setLocale(prev)
        toast.error(dictionary.settings.localeFailed)
      })
    }
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-background/80 p-1 text-xs font-medium shadow-sm backdrop-blur',
        className
      )}
      role="group"
      aria-label="Language switcher"
    >
      <button
        type="button"
        onClick={() => handleSwitch('zh')}
        className={cn(
          'rounded-full px-2.5 py-1 transition-colors',
          locale === 'zh'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {dictionary.nav.localeZh}
      </button>
      <button
        type="button"
        onClick={() => handleSwitch('en')}
        className={cn(
          'rounded-full px-2.5 py-1 transition-colors',
          locale === 'en'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {dictionary.nav.localeEn}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/language-toggle.tsx
git commit -m "feat(p3): LanguageToggle dual-mode with onPersist callback"
```

---

### Task 9: NavBar — Settings/Upgrade Entries + Pass onPersist

**Files:**
- Modify: `components/nav-bar.tsx`
- Modify: `components/quota-badge.tsx`

- [ ] **Step 1: Update NavBar**

Read `components/nav-bar.tsx` first. Then make these changes:

1. Add imports:

```typescript
import { Settings, ArrowUpCircle } from 'lucide-react'
import { updateLocaleAction } from '@/app/actions/settings'
```

2. In the user dropdown menu (after the `DropdownMenuLabel` and `DropdownMenuSeparator`), add two new items before the logout item:

```typescript
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => window.location.href = '/settings'}
              >
                <Settings className="size-4" />
                {dictionary.nav.settings}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => window.location.href = '/upgrade'}
              >
                <ArrowUpCircle className="size-4" />
                {dictionary.nav.upgrade}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
```

3. Pass `onPersist` to `LanguageToggle`:

```typescript
<LanguageToggle className="hidden sm:inline-flex" onPersist={updateLocaleAction} />
```

- [ ] **Step 2: Update QuotaBadge to be a clickable button**

Read `components/quota-badge.tsx` first. Wrap the existing badge content in a `<button>` that navigates to `/upgrade`:

Replace the outer element with:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from '@/components/locale-provider'

// ... existing interface

export function QuotaBadge({ dailyUsed, dailyLimit }: QuotaBadgeProps) {
  const router = useRouter()
  const { dictionary } = useLocale()
  // ... existing color logic

  return (
    <button
      type="button"
      onClick={() => router.push('/upgrade')}
      className={/* existing classes + cursor-pointer */}
      title={dictionary.nav.upgrade}
    >
      {/* existing content */}
    </button>
  )
}
```

Read the current file to get exact class names and preserve them. Add `cursor-pointer` to the className. Change the outer element from `<div>` to `<button>`.

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -10`

- [ ] **Step 4: Commit**

```bash
git add components/nav-bar.tsx components/quota-badge.tsx
git commit -m "feat(p3): add settings/upgrade to NavBar dropdown, make QuotaBadge clickable"
```

---

### Task 10: Form Components — Quota Error as Toast Only

**Files:**
- Modify: `components/scenario-form.tsx`
- Modify: `components/generate-form.tsx`
- Modify: `components/edit-form.tsx`

For each of the 3 form components, apply the same pattern:

- [ ] **Step 1: Update scenario-form.tsx**

Read `components/scenario-form.tsx`. Add imports:

```typescript
import { showQuotaError } from '@/lib/error-toast'
```

Find `handleSubmit`. After `setResult(res)`, add a quota error check:

```typescript
startTransition(async () => {
  const res = await editImageAction(formData) // or generateImageAction
  if (res.errorCode === 'quota_exceeded' && res.quota) {
    showQuotaError(locale, res.quota)
    return  // don't setResult — no inline error
  }
  setResult(res)
})
```

Apply the same pattern to both the upload branch and the text branch of handleSubmit. Also apply to `handleRetry`.

In the error display section, add a guard so quota errors don't show inline:

```typescript
{result && !result.success && result.errorCode !== 'quota_exceeded' && (
  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
    {result.error}
  </div>
)}
```

- [ ] **Step 2: Update generate-form.tsx**

Same pattern as Step 1. Read the file first. Add `showQuotaError` import. Update both `handleSubmit` and `handleRetry`. Guard the inline error display.

- [ ] **Step 3: Update edit-form.tsx**

Same pattern as Steps 1-2. Read the file first. Add `showQuotaError` import. Update `handleSubmit` and `handleRetry`. Guard the inline error display.

- [ ] **Step 4: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -10`

- [ ] **Step 5: Commit**

```bash
git add components/scenario-form.tsx components/generate-form.tsx components/edit-form.tsx
git commit -m "feat(p3): quota errors show toast only, not inline"
```

---

### Task 11: Phase 1 Build Verification

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -20`

- [ ] **Step 2: Run build**

Run: `npx next build 2>&1 | tail -30`

- [ ] **Step 3: Fix any issues and commit**

```bash
git add -A
git commit -m "fix(p3): resolve Phase 1 build errors"
```

---

## Phase 2: Feature Pages

### Task 12: DB Schema — images.isFavorite

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add isFavorite column to images table**

In `lib/db/schema.ts`, in the `images` table definition, after the `sourceImages` line, add:

```typescript
  isFavorite: text('isFavorite').$type<'true' | 'false'>().default('false').notNull(),
```

**Note:** Using text instead of boolean because Vercel Postgres / Drizzle sometimes has issues with boolean columns. The app will compare against `'true'`/`'false'` strings.

Actually, check if the project uses boolean elsewhere in schema. If it does, use boolean. If not, use text. Read the schema first.

Alternative (if Drizzle boolean works in the project):

```typescript
import { boolean } from 'drizzle-orm/pg-core'
// ... in images table:
  isFavorite: boolean('isFavorite').default(false).notNull(),
```

Use the `boolean` approach since PostgreSQL supports it natively.

- [ ] **Step 2: Update ImageRecord type**

In `lib/types.ts`, add to the `ImageRecord` interface:

```typescript
  isFavorite: boolean
```

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts lib/types.ts
git commit -m "feat(p3): add isFavorite column to images table"
```

---

### Task 13: Plans Configuration

**Files:**
- Create: `lib/plans.ts`

- [ ] **Step 1: Create plans config**

```typescript
// lib/plans.ts
import type { Locale } from '@/lib/i18n'

export interface Plan {
  id: string
  name: Record<Locale, string>
  price: Record<Locale, string>
  features: Record<Locale, string[]>
  ctaType: 'current' | 'contact'
}

export const plans: Plan[] = [
  {
    id: 'free',
    name: { zh: '免费版', en: 'Free' },
    price: { zh: '¥0/月', en: '$0/mo' },
    features: {
      zh: ['10 次/日', '200 次/月', '基础场景'],
      en: ['10/day', '200/month', 'Basic scenarios'],
    },
    ctaType: 'current',
  },
  {
    id: 'basic',
    name: { zh: '基础版', en: 'Basic' },
    price: { zh: '¥29/月', en: '$4.99/mo' },
    features: {
      zh: ['50 次/日', '1000 次/月', '全部场景', '4K 质量'],
      en: ['50/day', '1,000/month', 'All scenarios', '4K quality'],
    },
    ctaType: 'contact',
  },
  {
    id: 'pro',
    name: { zh: '专业版', en: 'Pro' },
    price: { zh: '¥99/月', en: '$14.99/mo' },
    features: {
      zh: ['200 次/日', '5000 次/月', '全部场景', '4K 质量', '优先队列'],
      en: ['200/day', '5,000/month', 'All scenarios', '4K quality', 'Priority queue'],
    },
    ctaType: 'contact',
  },
]
```

- [ ] **Step 2: Commit**

```bash
git add lib/plans.ts
git commit -m "feat(p3): add pricing plans configuration"
```

---

### Task 14: Upgrade Page

**Files:**
- Create: `app/(dashboard)/upgrade/page.tsx`
- Create: `components/plan-card.tsx`

- [ ] **Step 1: Create PlanCard component**

```typescript
// components/plan-card.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import type { Plan } from '@/lib/plans'

interface PlanCardProps {
  plan: Plan
}

export function PlanCard({ plan }: PlanCardProps) {
  const { locale } = useLocale()
  const t = copy[locale].upgrade

  return (
    <Card className="flex flex-col">
      <CardHeader className="text-center">
        <CardTitle className="text-lg">{plan.name[locale]}</CardTitle>
        <p className="text-2xl font-bold">{plan.price[locale]}</p>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2 text-sm">
          {plan.features[locale].map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <span className="text-primary">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {plan.ctaType === 'current' ? (
          <Button variant="outline" className="w-full" disabled>
            {t.currentPlan}
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => {
              window.location.href = 'mailto:support@image-studio.site'
            }}
          >
            {t.contactUs}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
```

- [ ] **Step 2: Create upgrade page**

```typescript
// app/(dashboard)/upgrade/page.tsx
'use client'

import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'
import { plans } from '@/lib/plans'
import { PlanCard } from '@/components/plan-card'

export default function UpgradePage() {
  const { locale } = useLocale()
  const t = copy[locale].upgrade

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t.pageTitle}</h1>
        <p className="text-muted-foreground">{t.pageDescription}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {t.contactEmail}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/plan-card.tsx app/(dashboard)/upgrade/page.tsx
git commit -m "feat(p3): add upgrade page with plan cards"
```

---

### Task 15: Avatar Upload Utility

**Files:**
- Create: `lib/upload-avatar.ts`

- [ ] **Step 1: Create upload-avatar utility**

```typescript
// lib/upload-avatar.ts
import { put, del } from '@vercel/blob'

export async function uploadAvatar(
  userId: string,
  imageBuffer: Buffer
): Promise<{ url: string }> {
  const filename = `avatars/${userId}.png`
  const blob = await put(filename, imageBuffer, {
    access: 'public',
    contentType: 'image/png',
    addRandomSuffix: false,
  })
  return { url: blob.url }
}

export async function deleteAvatar(url: string): Promise<void> {
  try {
    await del(url)
  } catch {
    // Non-fatal: avatar may already be deleted
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/upload-avatar.ts
git commit -m "feat(p3): add avatar upload utility"
```

---

### Task 16: Settings Server Actions (Profile + Password)

**Files:**
- Modify: `app/actions/settings.ts`

- [ ] **Step 1: Add profile and password actions**

Read the existing `app/actions/settings.ts` (created in Task 4). Append these actions:

```typescript
import { getUserById, getUserProfile, updateUserLocale } from '@/lib/db/queries'
import { uploadAvatar } from '@/lib/upload-avatar'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function updateProfileAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const displayName = (formData.get('displayName') as string)?.trim()
    const avatarFile = formData.get('avatar') as File | null

    if (displayName !== undefined && displayName !== null) {
      if (displayName.length < 1 || displayName.length > 50) {
        return { success: false, error: 'Name must be 1-50 characters', errorCode: 'validation_error' }
      }
    }

    const updates: Record<string, unknown> = {}

    if (displayName) {
      updates.name = displayName
    }

    if (avatarFile && avatarFile.size > 0) {
      const MAX_AVATAR_SIZE = 2 * 1024 * 1024
      const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

      if (avatarFile.size > MAX_AVATAR_SIZE) {
        return { success: false, error: 'Avatar must be under 2MB', errorCode: 'validation_error' }
      }
      if (!ALLOWED_TYPES.includes(avatarFile.type)) {
        return { success: false, error: 'Avatar must be PNG, JPG, or WebP', errorCode: 'validation_error' }
      }

      const buffer = Buffer.from(await avatarFile.arrayBuffer())
      const { url } = await uploadAvatar(session.user.id, buffer)
      updates.image = url
    }

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, session.user.id))
    }

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update profile' }
  }
}

export async function changePasswordAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string

    if (!currentPassword || !newPassword) {
      return { success: false, error: 'All password fields are required', errorCode: 'validation_error' }
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters', errorCode: 'validation_error' }
    }

    const user = await getUserById(session.user.id)
    if (!user?.password) {
      return { success: false, error: 'Cannot change password for this account' }
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect', errorCode: 'validation_error' }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, session.user.id))

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to change password' }
  }
}
```

**Important:** The imports at the top of the file need to be merged with the existing imports from Task 4. Read the file first to avoid duplicate imports.

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -10`

- [ ] **Step 3: Commit**

```bash
git add app/actions/settings.ts
git commit -m "feat(p3): add profile update and password change server actions"
```

---

### Task 17: Settings Page + Form

**Files:**
- Create: `app/(dashboard)/settings/page.tsx`
- Create: `components/settings-form.tsx`

- [ ] **Step 1: Create settings form component**

```typescript
// components/settings-form.tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocale } from '@/components/locale-provider'
import { copy, type Locale } from '@/lib/i18n'
import { updateProfileAction, updateLocaleAction, changePasswordAction } from '@/app/actions/settings'

interface SettingsFormProps {
  profile: {
    name: string | null
    email: string
    image: string | null
    locale: string
  }
}

export function SettingsForm({ profile }: SettingsFormProps) {
  const router = useRouter()
  const { locale } = useLocale()
  const t = copy[locale].settings

  // Profile state
  const [displayName, setDisplayName] = useState(profile.name ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.image)
  const avatarFileRef = useRef<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSavingProfile, startProfileTransition] = useTransition()

  // Language state
  const [selectedLocale, setSelectedLocale] = useState<Locale>(profile.locale as Locale)
  const [isSavingLocale, startLocaleTransition] = useTransition()

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSavingPassword, startPasswordTransition] = useTransition()

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    avatarFileRef.current = file
    setAvatarPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  function handleSaveProfile() {
    startProfileTransition(async () => {
      const formData = new FormData()
      formData.set('displayName', displayName)
      if (avatarFileRef.current) {
        formData.set('avatar', avatarFileRef.current)
      }
      const res = await updateProfileAction(formData)
      if (res.success) {
        toast.success(t.profileSuccess)
        avatarFileRef.current = null
        router.refresh()
      } else {
        toast.error(res.error ?? 'Failed')
      }
    })
  }

  function handleSaveLocale(newLocale: string) {
    setSelectedLocale(newLocale as Locale)
    startLocaleTransition(async () => {
      const res = await updateLocaleAction(newLocale)
      if (res.success) {
        toast.success(t.localeSuccess)
        router.refresh()
      } else {
        toast.error(t.localeFailed)
      }
    })
  }

  function handleChangePassword() {
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordMismatch)
      return
    }
    if (newPassword.length < 8) {
      setPasswordError(t.passwordTooShort)
      return
    }

    startPasswordTransition(async () => {
      const formData = new FormData()
      formData.set('currentPassword', currentPassword)
      formData.set('newPassword', newPassword)
      const res = await changePasswordAction(formData)
      if (res.success) {
        toast.success(t.passwordSuccess)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordError(res.error ?? 'Failed')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.profileSection}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.nameLabel}</Label>
            <div className="flex gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t.namePlaceholder}
                maxLength={50}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t.avatarLabel}</Label>
            <div className="flex items-center gap-4">
              {avatarPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Avatar" className="size-16 rounded-full object-cover ring-1 ring-border" />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3.5" />
                {t.avatarUpload}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? t.saving : t.saveButton}
          </Button>
        </CardContent>
      </Card>

      {/* Language Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.languageSection}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.languageLabel}</Label>
            <Select value={selectedLocale} onValueChange={handleSaveLocale} disabled={isSavingLocale}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.securitySection}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {passwordError}
            </div>
          )}
          <div className="space-y-2">
            <Label>{t.currentPassword}</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label>{t.newPassword}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label>{t.confirmPassword}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={isSavingPassword}>
            {isSavingPassword ? t.changingPassword : t.changePasswordButton}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create settings page**

```typescript
// app/(dashboard)/settings/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/db/queries'
import { SettingsForm } from '@/components/settings-form'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const profile = await getUserProfile(session.user.id)
  if (!profile) redirect('/login')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SettingsForm profile={profile} />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -10`

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/settings/page.tsx components/settings-form.tsx
git commit -m "feat(p3): add account settings page with profile, language, and password sections"
```

---

### Task 18: Gallery Actions — Filters + Favorites

**Files:**
- Modify: `app/actions/gallery.ts`
- Modify: `lib/db/queries.ts`

- [ ] **Step 1: Add filtered query to db/queries.ts**

Read `lib/db/queries.ts`. Add these new functions:

```typescript
export async function getUserImagesFiltered(
  userId: string,
  offset = 0,
  limit = 20,
  filters?: {
    favoriteOnly?: boolean
    timeRange?: 'today' | '7d' | '30d'
  }
) {
  const conditions = [eq(images.userId, userId)]

  if (filters?.favoriteOnly) {
    conditions.push(eq(images.isFavorite, true))
  }

  if (filters?.timeRange) {
    const now = new Date()
    let since: Date
    switch (filters.timeRange) {
      case 'today':
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case '7d':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }
    conditions.push(gte(images.createdAt, since))
  }

  const where = and(...conditions)

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(images)
      .where(where)
      .orderBy(desc(images.createdAt))
      .offset(offset)
      .limit(limit),
    db
      .select({ count: count() })
      .from(images)
      .where(where),
  ])

  return {
    images: rows,
    total: countResult[0]?.count ?? 0,
  }
}

export async function toggleImageFavorite(imageId: string, userId: string) {
  const image = await db
    .select({ isFavorite: images.isFavorite })
    .from(images)
    .where(and(eq(images.id, imageId), eq(images.userId, userId)))
    .limit(1)

  if (!image[0]) return null

  const newValue = !image[0].isFavorite
  await db
    .update(images)
    .set({ isFavorite: newValue })
    .where(and(eq(images.id, imageId), eq(images.userId, userId)))

  return newValue
}
```

You will need to add imports at the top of the file: `and`, `gte`, `desc`, `count` from `drizzle-orm`. Read the existing imports first and merge.

- [ ] **Step 2: Update gallery actions**

Read `app/actions/gallery.ts`. Update the `getImages` function signature and add `toggleFavoriteAction`:

```typescript
export async function getImages(
  offset?: number,
  limit?: number,
  filters?: {
    favoriteOnly?: boolean
    timeRange?: 'today' | '7d' | '30d'
  }
): Promise<ActionResult<GalleryResult>> {
  // ... auth check same as before
  // Replace the query call with:
  const result = await getUserImagesFiltered(
    session.user.id,
    offset ?? 0,
    Math.min(limit ?? 20, 100),
    filters
  )
  // ... return same structure
}

export async function toggleFavoriteAction(
  imageId: string
): Promise<ActionResult<{ isFavorite: boolean }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const newValue = await toggleImageFavorite(imageId, session.user.id)
    if (newValue === null) {
      return { success: false, error: 'Image not found' }
    }

    return { success: true, data: { isFavorite: newValue } }
  } catch {
    return { success: false, error: 'Failed to update favorite' }
  }
}
```

Import `getUserImagesFiltered` and `toggleImageFavorite` from `@/lib/db/queries`.

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -10`

- [ ] **Step 4: Commit**

```bash
git add lib/db/queries.ts app/actions/gallery.ts
git commit -m "feat(p3): add gallery filtered queries and toggle favorite action"
```

---

### Task 19: Gallery Filters Component

**Files:**
- Create: `components/gallery-filters.tsx`

- [ ] **Step 1: Create gallery filters**

```typescript
// components/gallery-filters.tsx
'use client'

import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocale } from '@/components/locale-provider'
import { copy } from '@/lib/i18n'

export type TimeRange = 'all' | 'today' | '7d' | '30d'

interface GalleryFiltersProps {
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  favoriteOnly: boolean
  onFavoriteToggle: () => void
}

export function GalleryFilters({
  timeRange,
  onTimeRangeChange,
  favoriteOnly,
  onFavoriteToggle,
}: GalleryFiltersProps) {
  const { locale } = useLocale()
  const t = copy[locale].galleryFilter

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={timeRange} onValueChange={(v) => onTimeRangeChange(v as TimeRange)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.all}</SelectItem>
          <SelectItem value="today">{t.today}</SelectItem>
          <SelectItem value="7d">{t.last7Days}</SelectItem>
          <SelectItem value="30d">{t.last30Days}</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant={favoriteOnly ? 'default' : 'outline'}
        size="sm"
        className="gap-1.5"
        onClick={onFavoriteToggle}
      >
        <Heart className="size-3.5" fill={favoriteOnly ? 'currentColor' : 'none'} />
        {t.favoritesOnly}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/gallery-filters.tsx
git commit -m "feat(p3): add GalleryFilters component with time range and favorites toggle"
```

---

### Task 20: Gallery Page with Filters

**Files:**
- Modify: `app/(dashboard)/gallery/page.tsx`

- [ ] **Step 1: Rewrite gallery page with filter state**

Replace the full content of `app/(dashboard)/gallery/page.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState, useCallback, useTransition } from 'react'
import { ImageGrid } from '@/components/image-grid'
import { GalleryFilters, type TimeRange } from '@/components/gallery-filters'
import { getImages } from '@/app/actions/gallery'
import type { ImageRecord } from '@/lib/types'

const PAGE_SIZE = 20

export default function GalleryPage() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [total, setTotal] = useState(0)
  const [isPending, startTransition] = useTransition()
  const loadedRef = useRef(false)

  // Filter state
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [favoriteOnly, setFavoriteOnly] = useState(false)

  const loadImages = useCallback(
    (offset: number, filters: { favoriteOnly: boolean; timeRange: TimeRange }) => {
      startTransition(async () => {
        const filterArg = {
          favoriteOnly: filters.favoriteOnly || undefined,
          timeRange: filters.timeRange === 'all' ? undefined : filters.timeRange,
        }
        const res = await getImages(offset, PAGE_SIZE, filterArg)
        if (res.success && res.data) {
          setImages((prev) =>
            offset === 0 ? res.data!.images : [...prev, ...res.data!.images]
          )
          setTotal(res.data.total)
        }
      })
    },
    []
  )

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true
      loadImages(0, { favoriteOnly, timeRange })
    }
  }, [loadImages, favoriteOnly, timeRange])

  function handleFilterChange(newTimeRange: TimeRange, newFavoriteOnly: boolean) {
    setImages([])
    setTotal(0)
    loadImages(0, { favoriteOnly: newFavoriteOnly, timeRange: newTimeRange })
  }

  function handleTimeRangeChange(range: TimeRange) {
    setTimeRange(range)
    handleFilterChange(range, favoriteOnly)
  }

  function handleFavoriteToggle() {
    const newVal = !favoriteOnly
    setFavoriteOnly(newVal)
    handleFilterChange(timeRange, newVal)
  }

  function handleLoadMore() {
    loadImages(images.length, { favoriteOnly, timeRange })
  }

  function handleImageDeleted(imageId: string) {
    setImages((prev) => prev.filter((img) => img.id !== imageId))
    setTotal((prev) => prev - 1)
  }

  function handleFavoriteChanged(imageId: string, isFavorite: boolean) {
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, isFavorite } : img))
    )
  }

  const hasMore = images.length < total

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `${total} image${total === 1 ? '' : 's'} in your collection`
              : 'Your generated and edited images will appear here.'}
          </p>
        </div>
        <GalleryFilters
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          favoriteOnly={favoriteOnly}
          onFavoriteToggle={handleFavoriteToggle}
        />
      </div>
      <ImageGrid
        images={images}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={isPending}
        onImageDeleted={handleImageDeleted}
        onFavoriteChanged={handleFavoriteChanged}
      />
    </div>
  )
}
```

**Note:** `ImageGrid` now receives `onFavoriteChanged` — this will be wired up in Task 21/22 when ImageCard and ImageViewer get favorite buttons.

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/gallery/page.tsx
git commit -m "feat(p3): gallery page with time range and favorites filters"
```

---

### Task 21: ImageCard + ImageGrid — Favorite Heart Icon

**Files:**
- Modify: `components/image-card.tsx`
- Modify: `components/image-grid.tsx`

- [ ] **Step 1: Add favorite heart to ImageCard**

Read `components/image-card.tsx`. Add the favorite heart icon. The card needs:

1. Import `Heart` from lucide-react and `toggleFavoriteAction` from gallery actions
2. Accept `onFavoriteChanged` callback prop
3. Show heart icon at top-right: filled if `image.isFavorite`, outline on hover otherwise
4. Click handler calls `toggleFavoriteAction` with optimistic update

Read the file first, then add a heart button overlay in the top-right corner of the image:

```typescript
// Inside the image container, add:
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation()
    handleToggleFavorite()
  }}
  className={cn(
    'absolute top-2 right-2 rounded-full bg-black/40 p-1.5 text-white transition-opacity',
    image.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
  )}
>
  <Heart className="size-4" fill={image.isFavorite ? 'currentColor' : 'none'} />
</button>
```

The `handleToggleFavorite` function:

```typescript
async function handleToggleFavorite() {
  // Optimistic update
  onFavoriteChanged?.(image.id, !image.isFavorite)
  const res = await toggleFavoriteAction(image.id)
  if (!res.success) {
    // Rollback
    onFavoriteChanged?.(image.id, image.isFavorite)
    toast.error('Failed')
  }
}
```

- [ ] **Step 2: Update ImageGrid to pass onFavoriteChanged**

Read `components/image-grid.tsx`. Add `onFavoriteChanged` prop and pass it through to ImageCard.

- [ ] **Step 3: Commit**

```bash
git add components/image-card.tsx components/image-grid.tsx
git commit -m "feat(p3): add favorite heart icon to ImageCard with optimistic toggle"
```

---

### Task 22: ImageViewer — Favorite Button

**Files:**
- Modify: `components/image-viewer.tsx`

- [ ] **Step 1: Add favorite toggle button to ImageViewer**

Read `components/image-viewer.tsx`. Add:

1. Accept `onFavoriteChanged` callback prop in `ImageViewerProps`
2. Add a favorite toggle button in the `DialogFooter`, after Copy Prompt and before Copy to Generate
3. Use `Heart` icon, filled when favorited
4. Optimistic update with rollback

```typescript
// In DialogFooter, add:
<Button
  variant="outline"
  size="sm"
  className="gap-1.5"
  onClick={handleToggleFavorite}
>
  <Heart className="size-3.5" fill={image.isFavorite ? 'currentColor' : 'none'} />
  {image.isFavorite ? '取消收藏' : '收藏'}
</Button>
```

The handler:

```typescript
async function handleToggleFavorite() {
  onFavoriteChanged?.(image!.id, !image!.isFavorite)
  const res = await toggleFavoriteAction(image!.id)
  if (!res.success) {
    onFavoriteChanged?.(image!.id, image!.isFavorite)
    toast.error('Failed')
  }
}
```

Import `toggleFavoriteAction` from `@/app/actions/gallery` and `Heart` from lucide-react.

- [ ] **Step 2: Commit**

```bash
git add components/image-viewer.tsx
git commit -m "feat(p3): add favorite toggle button to ImageViewer"
```

---

### Task 23: Phase 2 Build Verification

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | tail -30`

- [ ] **Step 2: Run build**

Run: `npx next build 2>&1 | tail -30`

- [ ] **Step 3: Fix any issues and commit**

```bash
git add -A
git commit -m "fix(p3): resolve Phase 2 build errors"
```

---

## Self-Review Checklist

| Spec Requirement | Task |
|-----------------|------|
| Structured error return (errorCode + quota) | Task 1 (types) + Task 5 (server actions) |
| Unified error toast with quota CTA | Task 1 (error-toast.ts) |
| Quota error = toast only, no inline | Task 10 (3 form components) |
| Toast dedup with fixed id | Task 1 (showQuotaError uses id: 'quota-exceeded') |
| chatRefine not changed (accept inconsistency) | Not touched — correct |
| users.locale column | Task 3 |
| LocaleSync component | Task 6 |
| Root layout untouched | Not in any task — correct |
| Dashboard layout reads DB profile | Task 7 |
| LanguageToggle dual-mode (onPersist) | Task 8 |
| NavBar settings/upgrade entries | Task 9 |
| QuotaBadge clickable → /upgrade | Task 9 |
| i18n for all new features | Task 2 |
| Settings page (profile + language + password) | Task 17 |
| Avatar upload (separate from storage.ts) | Task 15 |
| router.refresh() after settings save | Task 17 (in SettingsForm) |
| Password change — no forced logout | Task 16 (just updates DB) |
| Upgrade page (3 plan cards, contact us) | Task 14 |
| Plans config in lib/plans.ts | Task 13 |
| Gallery time range filter | Task 18 (query) + Task 19 (UI) + Task 20 (page) |
| Gallery favorites filter | Task 18 (query) + Task 19 (UI) + Task 20 (page) |
| images.isFavorite column | Task 12 |
| ImageCard heart icon | Task 21 |
| ImageViewer favorite button | Task 22 |
| Optimistic favorite with rollback | Task 21 + Task 22 |
| lint + build pass | Task 11 (Phase 1) + Task 23 (Phase 2) |
