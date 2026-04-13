import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { LandingPage } from '@/components/landing/home-page'
import { DASHBOARD_HOME } from '@/lib/navigation'

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    redirect(DASHBOARD_HOME)
  }

  return <LandingPage />
}
