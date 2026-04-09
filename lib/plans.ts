import type { Locale } from '@/lib/i18n'

export interface Plan {
  id: string
  name: Record<Locale, string>
  price: Record<Locale, string>
  features: Record<Locale, string[]>
  ctaType: 'current' | 'contact'
}

export const plans: Plan[] = [
  {
    id: 'free',
    name: { zh: '免费版', en: 'Free' },
    price: { zh: '¥0/月', en: '$0/mo' },
    features: {
      zh: ['10 次/日', '200 次/月', '基础场景'],
      en: ['10/day', '200/month', 'Basic scenarios'],
    },
    ctaType: 'current',
  },
  {
    id: 'basic',
    name: { zh: '基础版', en: 'Basic' },
    price: { zh: '¥29/月', en: '$4.99/mo' },
    features: {
      zh: ['50 次/日', '1000 次/月', '全部场景', '4K 质量'],
      en: ['50/day', '1,000/month', 'All scenarios', '4K quality'],
    },
    ctaType: 'contact',
  },
  {
    id: 'pro',
    name: { zh: '专业版', en: 'Pro' },
    price: { zh: '¥99/月', en: '$14.99/mo' },
    features: {
      zh: ['200 次/日', '5000 次/月', '全部场景', '4K 质量', '优先队列'],
      en: ['200/day', '5,000/month', 'All scenarios', '4K quality', 'Priority queue'],
    },
    ctaType: 'contact',
  },
]
