import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getQuotaInfo } from '@/lib/db/queries'
import { NavBar } from '@/components/nav-bar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  let quota = { dailyUsed: 0, dailyLimit: 10 }
  try {
    const quotaInfo = await getQuotaInfo(session.user.id!)
    quota = { dailyUsed: quotaInfo.dailyUsed, dailyLimit: quotaInfo.dailyLimit }
  } catch {
    // Fall back to defaults if quota check fails
  }

  const userInfo = {
    email: session.user.email ?? '',
    displayName: session.user.name ?? undefined,
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar user={userInfo} quota={quota} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  )
}
