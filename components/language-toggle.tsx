'use client'

import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLocale } from '@/components/locale-provider'
import type { Locale } from '@/lib/i18n'

interface LanguageToggleProps {
  className?: string
  onPersist?: (locale: Locale) => Promise<unknown>
}

export function LanguageToggle({ className, onPersist }: LanguageToggleProps) {
  const { locale, setLocale, dictionary } = useLocale()

  function handleSwitch(newLocale: Locale) {
    if (newLocale === locale) return
    const prev = locale
    setLocale(newLocale)

    if (onPersist) {
      onPersist(newLocale).catch(() => {
        setLocale(prev)
        toast.error(dictionary.settings.localeFailed)
      })
    }
  }

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
        onClick={() => handleSwitch('zh')}
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
        onClick={() => handleSwitch('en')}
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
