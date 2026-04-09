'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { LanguageToggle } from '@/components/language-toggle'
import { useLocale } from '@/components/locale-provider'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const sampleImages = [
  'https://picsum.photos/id/1011/900/720',
  'https://picsum.photos/id/1015/900/720',
  'https://picsum.photos/id/1025/900/720',
  'https://picsum.photos/id/1035/900/720',
  'https://picsum.photos/id/1041/900/720',
  'https://picsum.photos/id/1067/900/720',
  'https://picsum.photos/id/1074/900/720',
  'https://picsum.photos/id/1084/900/720',
] as const

export function LandingPage() {
  const { dictionary } = useLocale()

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.08),_transparent_32%),linear-gradient(180deg,#f8f2ea_0%,#fbf8f3_45%,#f4efe8_100%)] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.65),transparent_35%,rgba(0,0,0,0.04)_100%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-24 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-full border border-white/70 bg-white/70 px-4 py-3 shadow-[0_18px_40px_rgba(35,24,10,0.08)] backdrop-blur md:px-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.22em] text-foreground/80 uppercase"
          >
            <Sparkles className="size-4" />
            <span>{dictionary.landing.brand}</span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'rounded-full px-4'
              )}
            >
              {dictionary.landing.login}
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-between py-6 sm:py-8">
          <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 text-center">
            <span className="rounded-full border border-foreground/10 bg-white/75 px-3 py-1 text-[11px] font-medium tracking-[0.28em] text-foreground/55 uppercase shadow-sm">
              {dictionary.landing.eyebrow}
            </span>
            <h1 className="max-w-4xl text-balance text-4xl leading-none font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {dictionary.landing.headline}
            </h1>
            <p className="max-w-2xl text-balance text-sm leading-6 text-foreground/65 sm:text-base">
              {dictionary.landing.subheading}
            </p>
          </section>

          <section className="mt-6 sm:mt-8">
            <div className="mb-3 flex items-center justify-between text-[11px] font-medium tracking-[0.24em] text-foreground/45 uppercase">
              <span>{dictionary.landing.samplesLabel}</span>
              <span>08</span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {sampleImages.map((src, index) => (
                <article
                  key={src}
                  className="group relative overflow-hidden rounded-3xl border border-black/6 bg-black shadow-[0_24px_60px_rgba(34,24,10,0.14)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${dictionary.landing.sampleAltPrefix} ${index + 1}`}
                    className="h-28 w-full object-cover opacity-95 saturate-[0.9] transition-transform duration-500 group-hover:scale-105 sm:h-36 lg:h-40"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-sm font-medium text-white">
                      {dictionary.landing.samples[index]}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 flex flex-col items-center gap-4 sm:mt-8">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'rounded-full px-6 shadow-[0_18px_40px_rgba(34,24,10,0.18)]'
              )}
            >
              <span>{dictionary.landing.cta}</span>
              <ArrowRight className="size-4" />
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-foreground/55">
              <Link
                href="/terms"
                className="transition-colors hover:text-foreground"
              >
                {dictionary.legal.termsLink}
              </Link>
              <span aria-hidden="true">|</span>
              <Link
                href="/privacy"
                className="transition-colors hover:text-foreground"
              >
                {dictionary.legal.privacyLink}
              </Link>
              <span aria-hidden="true">|</span>
              <span>{dictionary.legal.footerCopyright}</span>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
