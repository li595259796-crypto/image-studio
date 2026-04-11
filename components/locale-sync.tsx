'use client'

import { useLayoutEffect } from 'react'
import { useLocale } from '@/components/locale-provider'
import { defaultLocale, type Locale } from '@/lib/i18n'

const LOCALE_USER_STORAGE_KEY = 'leo-image-studio-locale-user'

interface LocaleSyncProps {
  locale: Locale | null
  userId: string
}

export function LocaleSync({ locale, userId }: LocaleSyncProps) {
  const { locale: current, setLocale } = useLocale()

  useLayoutEffect(() => {
    const previousUserId = window.localStorage.getItem(LOCALE_USER_STORAGE_KEY)
    const nextLocale =
      locale ?? (previousUserId && previousUserId !== userId ? defaultLocale : null)

    if (nextLocale && nextLocale !== current) {
      setLocale(nextLocale)
    }

    window.localStorage.setItem(LOCALE_USER_STORAGE_KEY, userId)
  }, [locale, current, setLocale, userId])

  return null
}
