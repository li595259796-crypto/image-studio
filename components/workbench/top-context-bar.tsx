'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/components/locale-provider'

/* const routeDescriptions = {
  zh: {
    generate: '选择场景并开始新的创作流程。',
    edit: '上传参考图并描述你想完成的修改。',
    gallery: '集中查看、筛选并重用你的创作资产。',
    settings: '管理资料、语言偏好和账户安全。',
    upgrade: '查看额度与方案，决定何时升级。',
    default: '继续你的创作流程与账户管理。',
  },
  en: {
    generate: 'Choose a scenario and start a new creation flow.',
    edit: 'Upload source images and describe the changes you want.',
    gallery: 'Review, filter, and reuse your creative assets.',
    settings: 'Manage profile details, language preference, and account security.',
    upgrade: 'Review quota and plans when you need more room to create.',
    default: 'Continue your creation flow and account management.',
  },
} as const */

function getRouteKey(pathname: string) {
  if (pathname.startsWith('/generate')) return 'generate'
  if (pathname.startsWith('/edit')) return 'edit'
  if (pathname.startsWith('/gallery')) return 'gallery'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/upgrade')) return 'upgrade'
  return 'default'
}

interface TopContextBarProps {
  sidebarTrigger?: ReactNode
  actions?: ReactNode
}

export function TopContextBar({ sidebarTrigger, actions }: TopContextBarProps) {
  const pathname = usePathname()
  const { dictionary } = useLocale()
  const routeKey = getRouteKey(pathname)

  const titles = {
    generate: dictionary.scenario.pageTitle,
    edit: dictionary.nav.edit,
    gallery: dictionary.gallery.libraryTitle,
    settings: dictionary.settings.pageTitle,
    upgrade: dictionary.upgrade.pageTitle,
    default: dictionary.landing.workbenchLabel,
  } as const

  const descriptions = {
    generate: dictionary.scenario.pageDescription,
    edit: `${dictionary.scenario.uploadLabel} / ${dictionary.scenario.descriptionLabel}`,
    gallery: dictionary.gallery.libraryDescription,
    settings: dictionary.settings.pageDescription,
    upgrade: dictionary.upgrade.pageDescription,
    default: dictionary.landing.workbenchDescription,
  } as const

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 lg:hidden">{sidebarTrigger}</div>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              {dictionary.landing.workbenchLabel}
            </p>
            <p className="truncate text-lg font-semibold tracking-tight text-foreground">
              {titles[routeKey]}
            </p>
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {descriptions[routeKey]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <p className="hidden rounded-full border border-border/70 bg-background/75 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline-flex">
            {pathname.replace('/', '') || 'home'}
          </p>
        </div>
      </div>
    </header>
  )
}
