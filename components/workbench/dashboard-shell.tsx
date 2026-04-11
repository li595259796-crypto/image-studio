'use client'

import { useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { SidebarNav } from '@/components/workbench/sidebar-nav'
import { TopContextBar } from '@/components/workbench/top-context-bar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export interface DashboardShellProps {
  user: { email: string; displayName?: string; avatarUrl?: string }
  quota: { dailyUsed: number; dailyLimit: number }
  children: ReactNode
}

export function DashboardShell({ user, quota, children }: DashboardShellProps) {
  const { locale, dictionary } = useLocale()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(245,242,235,0.55),rgba(255,255,255,0.92))]">
      <div className="mx-auto min-h-screen max-w-[1600px] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarNav
          user={user}
          quota={quota}
          variant="desktop"
        />
        <div className="min-w-0 bg-background/90 lg:border-l lg:border-border/70">
          <TopContextBar
            sidebarTrigger={
              <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <DialogTrigger
                  className="inline-flex size-10 items-center justify-center rounded-2xl border border-border/80 bg-background/86 text-foreground shadow-none transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                  aria-label={locale === 'zh' ? '打开导航菜单' : 'Open navigation menu'}
                >
                  <Menu className="size-4" />
                  <span className="sr-only">
                    {locale === 'zh' ? '打开导航菜单' : 'Open navigation menu'}
                  </span>
                </DialogTrigger>
                <DialogContent
                  className="left-0 top-0 h-screen w-[min(22rem,calc(100%-0.75rem))] max-w-[22rem] translate-x-0 translate-y-0 overflow-hidden rounded-none rounded-r-[32px] border-r border-border/70 bg-background/96 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.2)] sm:max-w-[22rem]"
                  showCloseButton={false}
                >
                  <DialogTitle className="sr-only">
                    {dictionary.landing.workbenchLabel}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {dictionary.landing.workbenchDescription}
                  </DialogDescription>
                  <SidebarNav
                    user={user}
                    quota={quota}
                    variant="drawer"
                    onNavigate={() => setMobileNavOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            }
          />
          <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
