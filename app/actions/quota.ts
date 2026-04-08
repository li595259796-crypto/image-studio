'use server'

import { auth } from '@/lib/auth'
import { getQuotaInfo } from '@/lib/db/queries'
import type { ActionResult, QuotaInfo } from '@/lib/types'

export async function getQuotaInfoAction(): Promise<ActionResult<QuotaInfo>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' }
  }

  const quota = await getQuotaInfo(session.user.id)
  return { success: true, data: quota }
}
