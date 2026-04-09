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
