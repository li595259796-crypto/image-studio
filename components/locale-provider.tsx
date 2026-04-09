'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { copy, defaultLocale, type Locale } from '@/lib/i18n'

const STORAGE_KEY = 'leo-image-studio-locale'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  dictionary: (typeof copy)[Locale]
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === 'undefined') {
      return defaultLocale
    }

    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved === 'zh' || saved === 'en' ? saved : defaultLocale
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      dictionary: copy[locale],
    }),
    [locale]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)

  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }

  return context
}
