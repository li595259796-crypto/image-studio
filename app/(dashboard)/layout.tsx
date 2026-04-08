import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkQuota } from '@/lib/quota'
import { NavBar } from '@/components/nav-bar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  let quota = { dailyUsed: 0, dailyLimit: 10 }
  try {
    const quotaInfo = await checkQuota(supabase, user.id)
    quota = {
      dailyUsed: quotaInfo.dailyUsed,
      dailyLimit: quotaInfo.dailyLimit,
    }
  } catch {
    // Fall back to defaults if quota check fails
  }

  const userInfo = {
    email: user.email ?? '',
    displayName: user.user_metadata?.display_name as string | undefined,
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
