import { LandingPage } from '@/components/landing/home-page'

// No server-side auth check here — middleware.ts handles the logged-in
// redirect via cookie presence. Skipping `await auth()` lets Next.js treat
// this route as fully static (SSG), so anonymous visitors hit the Vercel
// edge cache instead of paying a cold-start on every request.
export default function Home() {
  return <LandingPage />
}
