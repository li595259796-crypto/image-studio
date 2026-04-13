'use server'

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isByokProvider, SUPPORTED_BYOK_PROVIDERS, type ByokProvider } from '@/lib/byok/providers'
import {
  encryptApiKey,
  getByokMasterKeyFromEnv,
  maskApiKey,
} from '@/lib/crypto/byok'
import { db } from '@/lib/db'
import {
  deleteUserApiKeyForUser,
  listUserApiKeysForUser,
  upsertUserApiKeyForUser,
} from '@/lib/db/user-api-keys-queries'
import { users } from '@/lib/db/schema'
import { getUserById, updateUserLocale } from '@/lib/db/queries'
import {
  createUserApiKeyViews,
  isValidApiKeyInput,
  type UserApiKeyViews,
} from '@/lib/settings/api-keys'
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
      const uploaded = await uploadAvatar(
        session.user.id,
        buffer,
        avatarFile.type as 'image/png' | 'image/jpeg' | 'image/webp'
      )
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

    if (newPassword.length > 72) {
      return { success: false, error: 'Password must be 72 characters or fewer' }
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

export async function listUserApiKeysAction(): Promise<
  ActionResult<{ providers: UserApiKeyViews }>
> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required',
        errorCode: 'auth_required',
      }
    }

    const masterKeyHex = getByokMasterKeyFromEnv()
    const records = await listUserApiKeysForUser(session.user.id)

    return {
      success: true,
      data: {
        providers: createUserApiKeyViews({
          userId: session.user.id,
          encryptedRecords: records,
          masterKeyHex,
        }),
      },
    }
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to load API keys',
    }
  }
}

export async function saveUserApiKeyAction(input: {
  provider: string
  apiKey: string
}): Promise<ActionResult<{ provider: ByokProvider; maskedKey: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required',
        errorCode: 'auth_required',
      }
    }

    if (!isByokProvider(input.provider)) {
      return {
        success: false,
        error: 'Unsupported provider',
        errorCode: 'validation_error',
      }
    }

    const apiKey = input.apiKey.trim()
    if (!isValidApiKeyInput(apiKey)) {
      return {
        success: false,
        error: 'API key must be between 8 and 4096 characters',
        errorCode: 'validation_error',
      }
    }

    const masterKeyHex = getByokMasterKeyFromEnv()
    const encrypted = encryptApiKey({
      plaintext: apiKey,
      userId: session.user.id,
      masterKeyHex,
    })

    await upsertUserApiKeyForUser({
      userId: session.user.id,
      provider: input.provider,
      encryptedKey: encrypted.encryptedKey,
      keyVersion: encrypted.keyVersion,
    })

    return {
      success: true,
      data: {
        provider: input.provider,
        maskedKey: maskApiKey(apiKey),
      },
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save API key',
    }
  }
}

export async function deleteUserApiKeyAction(
  provider: string
): Promise<ActionResult<{ provider: ByokProvider }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Authentication required',
        errorCode: 'auth_required',
      }
    }

    if (!isByokProvider(provider)) {
      return {
        success: false,
        error: 'Unsupported provider',
        errorCode: 'validation_error',
      }
    }

    await deleteUserApiKeyForUser(session.user.id, provider)

    return {
      success: true,
      data: { provider },
    }
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete API key',
    }
  }
}

// Server Actions must be async — Next.js App Router requirement for 'use server' files
export async function listSupportedByokProviders(): Promise<readonly ByokProvider[]> {
  return SUPPORTED_BYOK_PROVIDERS
}
