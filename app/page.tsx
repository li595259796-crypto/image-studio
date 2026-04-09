import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { LandingPage } from '@/components/landing/home-page'

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    redirect('/generate')
  }

  return <LandingPage />
}
