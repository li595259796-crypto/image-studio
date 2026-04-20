import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import { LocaleProvider } from '@/components/locale-provider'
import { BRAND_NAME, defaultLocale } from '@/lib/i18n'
import './globals.css'
// Excalidraw CSS is now imported inside components/canvas/excalidraw-board.tsx
// so it only loads on routes that actually render the canvas editor. Keeping
// it here was adding ~141 KB of render-blocking CSS to every route (landing,
// login, settings, etc.).

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: 'AI-powered image generation and editing for fast visual ideas.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang={defaultLocale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </SessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
