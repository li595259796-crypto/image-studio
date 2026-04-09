'use server'

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getUserById, updateUserLocale } from '@/lib/db/queries'
import type { ActionResult } from '@/lib/types'
import { uploadAvatar } from '@/lib/upload-avatar'

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

export async function updateProfileAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const displayName = String(formData.get('displayName') ?? '').trim()
    const avatarValue = formData.get('avatar')
    const avatarFile = avatarValue instanceof File && avatarValue.size > 0
      ? avatarValue
      : null

    if (displayName.length < 1 || displayName.length > 50) {
      return { success: false, error: 'Display name must be between 1 and 50 characters' }
    }

    if (avatarFile) {
      const validTypes = ['image/png', 'image/jpeg', 'image/webp']
      if (!validTypes.includes(avatarFile.type)) {
        return { success: false, error: 'Avatar must be PNG, JPG, or WebP' }
      }

      if (avatarFile.size > 2 * 1024 * 1024) {
        return { success: false, error: 'Avatar must be 2MB or smaller' }
      }
    }

    const user = await getUserById(session.user.id)

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    let imageUrl: string | undefined

    if (avatarFile) {
      const buffer = Buffer.from(await avatarFile.arrayBuffer())
      const uploaded = await uploadAvatar(session.user.id, buffer)
      imageUrl = uploaded.url
    }

    const updates: Partial<typeof users.$inferInsert> = {
      name: displayName,
    }

    if (imageUrl) {
      updates.image = imageUrl
    }

    await db.update(users).set(updates).where(eq(users.id, session.user.id))

    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update profile'
    return { success: false, error: message }
  }
}

export async function changePasswordAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const currentPassword = String(formData.get('currentPassword') ?? '')
    const newPassword = String(formData.get('newPassword') ?? '')

    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' }
    }

    const user = await getUserById(session.user.id)

    if (!user?.password) {
      return { success: false, error: 'Current password is incorrect' }
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password)

    if (!isValidPassword) {
      return { success: false, error: 'Current password is incorrect' }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await db
      .update(users)
      .set({ password: passwordHash })
      .where(eq(users.id, session.user.id))

    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to change password'
    return { success: false, error: message }
  }
}
