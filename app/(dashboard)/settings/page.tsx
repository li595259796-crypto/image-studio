import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getUserProfile } from '@/lib/db/queries'
import { SettingsForm } from '@/components/settings-form'
import { DASHBOARD_HOME } from '@/lib/navigation'

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const profile = await getUserProfile(session.user.id)

  if (!profile) {
    redirect(DASHBOARD_HOME)
  }

  return <SettingsForm profile={profile} />
}
