import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SettingsTabsForm } from '@/components/settings/settings-tabs-form'
import { getUserProfile } from '@/lib/db/queries'
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

  return <SettingsTabsForm profile={profile} />
}
