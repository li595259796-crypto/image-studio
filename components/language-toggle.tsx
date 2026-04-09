'use client'

import { cn } from '@/lib/utils'
import { useLocale } from '@/components/locale-provider'

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, dictionary } = useLocale()

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-background/80 p-1 text-xs font-medium shadow-sm backdrop-blur',
        className
      )}
      role="group"
      aria-label="Language switcher"
    >
      <button
        type="button"
        onClick={() => setLocale('zh')}
        className={cn(
          'rounded-full px-2.5 py-1 transition-colors',
          locale === 'zh'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {dictionary.nav.localeZh}
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={cn(
          'rounded-full px-2.5 py-1 transition-colors',
          locale === 'en'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {dictionary.nav.localeEn}
      </button>
    </div>
  )
}
