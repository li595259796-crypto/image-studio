'use server'

import { auth } from '@/lib/auth'
import { updateUserLocale } from '@/lib/db/queries'
import type { ActionResult } from '@/lib/types'

export async function updateLocaleAction(
  locale: string
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    if (locale !== 'zh' && locale !== 'en') {
      return { success: false, error: 'Invalid locale', errorCode: 'validation_error' }
    }

    await updateUserLocale(session.user.id, locale)
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update locale' }
  }
}
