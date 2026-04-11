'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpCircle,
  ChevronsUpDown,
  Images,
  LogOut,
  Settings,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { useLocale } from '@/components/locale-provider'
import { QuotaBadge } from '@/components/quota-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BRAND_NAME } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface WorkbenchNavItem {
  href: '/generate' | '/edit' | '/gallery' | '/settings' | '/upgrade'
  label: string
  icon: LucideIcon
  group: 'primary' | 'secondary'
}

interface SidebarNavProps {
  user: { email: string; displayName?: string; avatarUrl?: string }
  quota: { dailyUsed: number; dailyLimit: number }
  variant?: 'desktop' | 'drawer'
  onNavigate?: () => void
}

function getInitials(email: string, displayName?: string) {
  if (displayName) {
    return displayName
      .split(' ')
      .filter(Boolean)
      .map((name) => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return email.slice(0, 2).toUpperCase()
}

function isActivePath(pathname: string, href: WorkbenchNavItem['href']) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SidebarNav({
  user,
  quota,
  variant = 'desktop',
  onNavigate,
}: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { dictionary } = useLocale()

  const navItems: WorkbenchNavItem[] = [
    { href: '/generate', label: dictionary.scenario.pageTitle, icon: Wand2, group: 'primary' },
    { href: '/edit', label: dictionary.nav.edit, icon: Sparkles, group: 'primary' },
    { href: '/gallery', label: dictionary.gallery.libraryTitle, icon: Images, group: 'primary' },
    { href: '/settings', label: dictionary.nav.settings, icon: Settings, group: 'secondary' },
    { href: '/upgrade', label: dictionary.nav.upgrade, icon: ArrowUpCircle, group: 'secondary' },
  ]

  const primaryItems = navItems.filter((item) => item.group === 'primary')
  const secondaryItems = navItems.filter((item) => item.group === 'secondary')
  const isDesktop = variant === 'desktop'

  return (
    <aside
      className={cn(
        'flex flex-col',
        isDesktop
          ? 'hidden border-b border-border/70 bg-background/72 backdrop-blur lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-hidden lg:border-b-0'
          : 'h-full min-h-0 bg-background/96'
      )}
    >
      <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4 sm:px-6 lg:px-5 lg:py-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/generate"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-2xl px-2 py-2 text-sm font-semibold tracking-[0.02em] text-foreground transition-colors hover:text-primary"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
              <Wand2 className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {dictionary.landing.workbenchLabel}
              </span>
              <span className="block truncate text-base">{BRAND_NAME}</span>
            </span>
          </Link>
        </div>

        <nav
          className={cn(
            'flex gap-2 pb-1',
            isDesktop ? 'mt-8 flex-col overflow-visible' : 'mt-6 flex-col overflow-visible'
          )}
        >
          {primaryItems.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href)

            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  buttonVariants({ variant: active ? 'secondary' : 'ghost', size: 'lg' }),
                  'h-11 shrink-0 justify-start gap-3 rounded-2xl px-4 text-sm',
                  active &&
                    'bg-foreground text-background shadow-[0_12px_30px_-18px_rgba(15,23,42,0.65)] hover:bg-foreground/95 hover:text-background'
                )}
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-5 grid gap-3 lg:mt-auto">
          <QuotaBadge
            dailyUsed={quota.dailyUsed}
            dailyLimit={quota.dailyLimit}
            variant="panel"
            className="w-full"
          />

          <div className="grid gap-2">
            {secondaryItems.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href)

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    buttonVariants({ variant: active ? 'secondary' : 'ghost', size: 'default' }),
                    'h-10 justify-start gap-3 rounded-2xl px-3 text-sm',
                    active && 'bg-muted text-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="cursor-pointer rounded-2xl border border-border/70 bg-background/80 p-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex items-center gap-3">
                <Avatar>
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.displayName ?? user.email} />
                  ) : null}
                  <AvatarFallback>{getInitials(user.email, user.displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.displayName ?? user.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <ChevronsUpDown className="size-4 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-64">
              <DropdownMenuLabel>{user.displayName ?? user.email}</DropdownMenuLabel>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  onNavigate?.()
                  router.push('/settings')
                }}
              >
                <Settings className="size-4" />
                {dictionary.nav.settings}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  onNavigate?.()
                  router.push('/upgrade')
                }}
              >
                <ArrowUpCircle className="size-4" />
                {dictionary.nav.upgrade}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  onNavigate?.()
                  signOut({ callbackUrl: '/login', redirect: true })
                }}
              >
                <LogOut className="size-4" />
                {dictionary.nav.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  )
}
