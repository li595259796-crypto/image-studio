'use client'

import { useRef } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLocale } from '@/components/locale-provider'
import type { Locale } from '@/lib/i18n'

interface LanguageToggleProps {
  className?: string
  onPersist?: (locale: Locale) => Promise<unknown>
  variant?: 'default' | 'shell'
}

function isLocalePersistFailure(
  result: unknown
): result is { success: false; error?: string } {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    result.success === false
  )
}

export function LanguageToggle({
  className,
  onPersist,
  variant = 'default',
}: LanguageToggleProps) {
  const { locale, setLocale, dictionary } = useLocale()
  const persistRequestRef = useRef(0)

  function handleSwitch(newLocale: Locale) {
    if (newLocale === locale) return
    const prev = locale
    const requestId = persistRequestRef.current + 1
    persistRequestRef.current = requestId
    setLocale(newLocale)

    if (onPersist) {
      onPersist(newLocale)
        .then((result) => {
          if (persistRequestRef.current !== requestId) {
            return
          }

          if (isLocalePersistFailure(result)) {
            setLocale(prev)
            toast.error(result.error ?? dictionary.settings.localeFailed)
          }
        })
        .catch(() => {
          if (persistRequestRef.current !== requestId) {
            return
          }

          setLocale(prev)
          toast.error(dictionary.settings.localeFailed)
        })
    }
  }

  return (
    <div
      className={cn(
        variant === 'shell'
          ? 'inline-flex w-full items-center rounded-2xl border border-border/70 bg-background/80 p-1 text-xs font-medium shadow-sm backdrop-blur'
          : 'inline-flex items-center rounded-full border border-border bg-background/80 p-1 text-xs font-medium shadow-sm backdrop-blur',
        className
      )}
      role="group"
      aria-label={locale === 'zh' ? '语言切换' : 'Language switcher'}
    >
      <button
        type="button"
        onClick={() => handleSwitch('zh')}
        aria-pressed={locale === 'zh'}
        className={cn(
          variant === 'shell'
            ? 'flex-1 rounded-xl px-3 py-2 text-center transition-colors'
            : 'rounded-full px-2.5 py-1 transition-colors',
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
        aria-pressed={locale === 'en'}
        className={cn(
          variant === 'shell'
            ? 'flex-1 rounded-xl px-3 py-2 text-center transition-colors'
            : 'rounded-full px-2.5 py-1 transition-colors',
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
