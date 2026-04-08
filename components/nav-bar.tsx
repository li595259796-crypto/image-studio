'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Wand2, ImagePlus, Images, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  user: { email: string; displayName?: string }
  quota: { dailyUsed: number; dailyLimit: number }
}

const navLinks = [
  { href: '/generate', label: 'Generate', icon: Wand2 },
  { href: '/edit', label: 'Edit', icon: ImagePlus },
  { href: '/gallery', label: 'Gallery', icon: Images },
] as const

function getInitials(email: string, displayName?: string): string {
  if (displayName) {
    return displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

export function NavBar({ user, quota }: NavBarProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/generate"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <Wand2 className="size-5 text-primary" />
            <span>Image Studio</span>
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
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <QuotaBadge
            dailyUsed={quota.dailyUsed}
            dailyLimit={quota.dailyLimit}
          />

          <DropdownMenu>
            <DropdownMenuTrigger
              className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar size="sm">
                <AvatarFallback className="text-xs">
                  {getInitials(user.email, user.displayName)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8}>
              <DropdownMenuLabel>
                {user.displayName ?? user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
