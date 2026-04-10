'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Wand2, ImagePlus, Images, LogOut, Settings, ArrowUpCircle } from 'lucide-react'
import { LanguageToggle } from '@/components/language-toggle'
import { updateLocaleAction } from '@/app/actions/settings'
import { useLocale } from '@/components/locale-provider'
import { BRAND_NAME } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { QuotaBadge } from '@/components/quota-badge'

interface NavBarProps {
  user: { email: string; displayName?: string; avatarUrl?: string }
  quota: { dailyUsed: number; dailyLimit: number }
}

function getInitials(email: string, displayName?: string): string {
  if (displayName) {
    return displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

export function NavBar({ user, quota }: NavBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { dictionary } = useLocale()

  const navLinks = [
    { href: '/generate', label: dictionary.nav.generate, icon: Wand2 },
    { href: '/edit', label: dictionary.nav.edit, icon: ImagePlus },
    { href: '/gallery', label: dictionary.nav.gallery, icon: Images },
  ] as const

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 shadow-[0_10px_30px_rgba(34,24,10,0.04)] backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/generate"
            className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <Wand2 className="size-5 text-primary" />
            <span className="whitespace-nowrap">{BRAND_NAME}</span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href
              return (
                <Button
                  key={href}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-1.5 shrink-0',
                    isActive && 'font-semibold'
                  )}
                  render={<Link href={href} />}
                  nativeButton={false}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle className="hidden sm:inline-flex" onPersist={updateLocaleAction} />
          <QuotaBadge
            dailyUsed={quota.dailyUsed}
            dailyLimit={quota.dailyLimit}
          />

          <DropdownMenu>
            <DropdownMenuTrigger
              className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar size="sm">
                {user.avatarUrl && (
                  <AvatarImage src={user.avatarUrl} alt={user.displayName ?? user.email} />
                )}
                <AvatarFallback className="text-xs">
                  {getInitials(user.email, user.displayName)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <DropdownMenuLabel>
                {user.displayName ?? user.email}
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => { router.push('/settings') }}
              >
                <Settings className="size-4" />
                {dictionary.nav.settings}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => { router.push('/upgrade') }}
              >
                <ArrowUpCircle className="size-4" />
                {dictionary.nav.upgrade}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => signOut({ callbackUrl: '/login', redirect: true })}
              >
                <LogOut className="size-4" />
                {dictionary.nav.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
