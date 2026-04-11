'use client'

import type { ReactNode } from 'react'
import { DashboardShell } from '@/components/workbench/dashboard-shell'

interface NavBarProps {
  user: { email: string; displayName?: string; avatarUrl?: string }
  quota: { dailyUsed: number; dailyLimit: number }
  children?: ReactNode
}

export function NavBar({ user, quota, children }: NavBarProps) {
  return (
    <DashboardShell user={user} quota={quota}>
      {children ?? null}
    </DashboardShell>
  )
}
