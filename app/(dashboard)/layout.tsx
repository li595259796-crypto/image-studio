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

  // Single guarded block for all DB reads
  let profile: { name: string | null; email: string; image: string | null; locale: string } | null = null
  let quota = { dailyUsed: 0, dailyLimit: 10 }

  try {
    const [profileResult, quotaInfo] = await Promise.all([
      getUserProfile(userId),
      getQuotaInfo(userId),
    ])
    profile = profileResult
    quota = { dailyUsed: quotaInfo.dailyUsed, dailyLimit: quotaInfo.dailyLimit }
  } catch {
    // Fall back to session data if DB is unavailable
  }

  const userInfo = {
    email: profile?.email ?? session.user.email ?? '',
    displayName: profile?.name ?? undefined,
    avatarUrl: profile?.image ?? undefined,
  }

  const rawLocale = profile?.locale
  const dbLocale: Locale = rawLocale === 'en' || rawLocale === 'zh' ? rawLocale : 'zh'

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(161,98,7,0.08),transparent_30%),linear-gradient(180deg,rgba(248,242,234,0.85),rgba(255,255,255,0.96)_42%)]">
      <LocaleSync locale={dbLocale} />
      <NavBar user={userInfo} quota={quota} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  )
}
