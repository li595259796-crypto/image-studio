import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

// Covers 99%+ of real-world emails; full RFC 5322 is intentionally out of scope
// for a format-only check (final source of truth is delivery at reset time).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 72 // bcrypt silently truncates past 72 bytes
const MAX_EMAIL_LENGTH = 254 // RFC 5321 practical cap
const MAX_NAME_LENGTH = 100

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; name?: unknown }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  }

  const { email, password, name } = body

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  if (normalizedEmail.length === 0 || normalizedEmail.length > MAX_EMAIL_LENGTH) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    )
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer` },
      { status: 400 }
    )
  }

  const safeName =
    typeof name === 'string' && name.trim().length > 0
      ? name.trim().slice(0, MAX_NAME_LENGTH)
      : null

  try {
    const existing = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, normalizedEmail),
    })

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await db.insert(users).values({
      email: normalizedEmail,
      name: safeName,
      password: hashedPassword,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
