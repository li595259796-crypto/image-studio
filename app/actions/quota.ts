'use server'

import { createClient } from '@/lib/supabase/server'
import { checkQuota } from '@/lib/quota'
import type { ActionResult, QuotaInfo } from '@/lib/types'

export async function getQuotaInfo(): Promise<ActionResult<QuotaInfo>> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const quota = await checkQuota(supabase, user.id)

    return { success: true, data: quota }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    return { success: false, error: message }
  }
}
