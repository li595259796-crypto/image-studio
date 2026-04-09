'use client'

import { useEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import type { Locale } from '@/lib/i18n'

interface LocaleSyncProps {
  locale: Locale
}

export function LocaleSync({ locale }: LocaleSyncProps) {
  const { locale: current, setLocale } = useLocale()

  useEffect(() => {
    if (locale && locale !== current) {
      setLocale(locale)
    }
  }, [locale, current, setLocale])

  return null
}
