'use client'

import Link from 'next/link'
import { ChevronLeft, Sparkles } from 'lucide-react'
import { LanguageToggle } from '@/components/language-toggle'
import { useLocale } from '@/components/locale-provider'

type LegalPageKind = 'terms' | 'privacy'

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const { dictionary } = useLocale()
  const title =
    kind === 'terms'
      ? dictionary.legal.termsTitle
      : dictionary.legal.privacyTitle
  const intro =
    kind === 'terms'
      ? dictionary.legal.termsIntro
      : dictionary.legal.privacyIntro
  const sections =
    kind === 'terms'
      ? dictionary.legal.termsSections
      : dictionary.legal.privacySections

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f2ea_0%,#fbf8f3_42%,#f4efe8_100%)] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col rounded-[2rem] border border-black/6 bg-white/75 p-5 shadow-[0_30px_80px_rgba(34,24,10,0.08)] backdrop-blur sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 pb-4">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.2em] text-foreground/75 uppercase">
            <Sparkles className="size-4" />
            <span>{dictionary.landing.brand}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-2 text-sm transition-colors hover:bg-black/4"
            >
              <ChevronLeft className="size-4" />
              {dictionary.legal.backHome}
            </Link>
          </div>
        </header>

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="space-y-3">
              <p className="text-xs font-medium tracking-[0.28em] text-foreground/45 uppercase">
                {kind === 'terms'
                  ? dictionary.legal.termsLink
                  : dictionary.legal.privacyLink}
              </p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-foreground/65 sm:text-base">
                {intro}
              </p>
            </div>

            <div className="space-y-4">
              {sections.map((section) => (
                <section
                  key={section.title}
                  className="rounded-3xl border border-black/8 bg-white/80 p-5 shadow-sm"
                >
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-foreground/68 sm:text-base">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
