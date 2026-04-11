import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getQuotaInfo, getUserProfile } from '@/lib/db/queries'
import { LocaleSync } from '@/components/locale-sync'
import { DashboardShell } from '@/components/workbench/dashboard-shell'
import { defaultLocale, type Locale } from '@/lib/i18n'

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
  let profileLoaded = false

  try {
    const [profileResult, quotaInfo] = await Promise.all([
      getUserProfile(userId),
      getQuotaInfo(userId),
    ])
    profile = profileResult
    quota = { dailyUsed: quotaInfo.dailyUsed, dailyLimit: quotaInfo.dailyLimit }
    profileLoaded = true
  } catch {
    // Fall back to session data if DB is unavailable
  }

  const userInfo = {
    email: profile?.email ?? session.user.email ?? '',
    displayName: profile?.name ?? undefined,
    avatarUrl: profile?.image ?? undefined,
  }

  const rawLocale = profile?.locale
  const dbLocale: Locale | null =
    rawLocale === 'en' || rawLocale === 'zh'
      ? rawLocale
      : profileLoaded
        ? defaultLocale
        : null

  return (
    <div className="min-h-screen">
      <LocaleSync locale={dbLocale} userId={userId} />
      <DashboardShell user={userInfo} quota={quota}>
        {children}
      </DashboardShell>
    </div>
  )
}
