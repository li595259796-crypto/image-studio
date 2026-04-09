'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-xl font-semibold">出了点问题</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        页面加载时发生错误，请重试。如果问题持续，请刷新页面。
      </p>
      <Button onClick={reset}>重试</Button>
    </div>
  )
}
