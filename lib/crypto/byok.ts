import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto'

export const CURRENT_BYOK_KEY_VERSION = 1

const AES_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH_BYTES = 12
const AUTH_TAG_LENGTH_BYTES = 16
const DERIVED_KEY_LENGTH_BYTES = 32

function decodeMasterKey(masterKeyHex: string): Buffer {
  const trimmed = masterKeyHex.trim()
  if (!trimmed) {
    throw new Error('ENCRYPTION_KEY is required for BYOK encryption')
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex')
  }

  return Buffer.from(trimmed, 'utf8')
}

function getDerivationInfo(keyVersion: number): Buffer {
  return Buffer.from(`byok-v${keyVersion}`, 'utf8')
}

function getPayloadPrefix(keyVersion: number): string {
  return `v${keyVersion}`
}

export function getByokMasterKeyFromEnv(): string {
  const value = process.env.ENCRYPTION_KEY?.trim()
  if (!value) {
    throw new Error('ENCRYPTION_KEY is not configured')
  }

  return value
}

export function deriveByokKey(input: {
  userId: string
  masterKeyHex: string
  keyVersion: number
}): Buffer {
  return Buffer.from(
    hkdfSync(
      'sha256',
      decodeMasterKey(input.masterKeyHex),
      Buffer.from(input.userId, 'utf8'),
      getDerivationInfo(input.keyVersion),
      DERIVED_KEY_LENGTH_BYTES
    )
  )
}

export function encryptApiKey(input: {
  plaintext: string
  userId: string
  masterKeyHex: string
  keyVersion?: number
}): {
  encryptedKey: string
  keyVersion: number
} {
  const keyVersion = input.keyVersion ?? CURRENT_BYOK_KEY_VERSION
  const key = deriveByokKey({
    userId: input.userId,
    masterKeyHex: input.masterKeyHex,
    keyVersion,
  })
  const iv = randomBytes(IV_LENGTH_BYTES)
  const cipher = createCipheriv(AES_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  })

  const encrypted = Buffer.concat([
    cipher.update(input.plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return {
    encryptedKey: formatEncryptedKeyPayload({
      version: keyVersion,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      ciphertext: encrypted.toString('base64'),
    }),
    keyVersion,
  }
}

export function formatEncryptedKeyPayload(input: {
  version: number
  iv: string
  authTag: string
  ciphertext: string
}): string {
  return `${getPayloadPrefix(input.version)}:${input.iv}:${input.authTag}:${input.ciphertext}`
}

export function parseEncryptedKeyPayload(value: string): {
  version: number
  iv: string
  authTag: string
  ciphertext: string
} {
  const [prefix, iv, authTag, ciphertext] = value.split(':')

  if (!prefix || !iv || !authTag || !ciphertext || !/^v\d+$/.test(prefix)) {
    throw new Error('Invalid encrypted API key payload')
  }

  return {
    version: Number(prefix.slice(1)),
    iv,
    authTag,
    ciphertext,
  }
}

export function decryptApiKey(input: {
  encryptedKey: string
  userId: string
  masterKeyHex: string
  keyVersion: number
}): string {
  try {
    const payload = parseEncryptedKeyPayload(input.encryptedKey)
    const key = deriveByokKey({
      userId: input.userId,
      masterKeyHex: input.masterKeyHex,
      keyVersion: input.keyVersion,
    })
    const decipher = createDecipheriv(
      AES_ALGORITHM,
      key,
      Buffer.from(payload.iv, 'base64'),
      {
        authTagLength: AUTH_TAG_LENGTH_BYTES,
      }
    )
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'base64')),
      decipher.final(),
    ])

    return decrypted.toString('utf8')
  } catch (error: unknown) {
    throw new Error(
      error instanceof Error
        ? `Failed to decrypt API key: ${error.message}`
        : 'Failed to decrypt API key'
    )
  }
}

export function maskApiKey(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  if (value.length <= 4) {
    return '*'.repeat(value.length)
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}${'*'.repeat(value.length - 2)}`
  }

  return `${value.slice(0, 4)}${'*'.repeat(value.length - 8)}${value.slice(-4)}`
}
