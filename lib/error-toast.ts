import { toast } from 'sonner'
import type { Locale } from '@/lib/i18n'

interface QuotaPayload {
  dailyUsed: number
  dailyLimit: number
  monthlyUsed: number
  monthlyLimit: number
}

const messages: Record<Locale, { title: string; cta: string }> = {
  zh: { title: '今日额度已用完', cta: '查看升级方案 →' },
  en: { title: 'Daily quota exceeded', cta: 'View upgrade plans →' },
}

export function showError(message: string): void {
  toast.error(message)
}

export function showQuotaError(locale: Locale, quota: QuotaPayload): void {
  const t = messages[locale]
  toast.error(t.title, {
    id: 'quota-exceeded',
    description: `${locale === 'zh' ? '日' : 'Daily'}: ${quota.dailyUsed}/${quota.dailyLimit}  ${locale === 'zh' ? '月' : 'Monthly'}: ${quota.monthlyUsed}/${quota.monthlyLimit}`,
    action: {
      label: t.cta,
      onClick: () => { window.location.href = '/upgrade' },
    },
    duration: 8000,
  })
}
