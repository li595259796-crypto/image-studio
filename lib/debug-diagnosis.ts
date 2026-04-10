// TEMP-DIAGNOSIS: pure helpers shared by app/api/debug/*. Delete at teardown.
// Intentionally zero imports — keeps the module trivially testable with
// `node --test --experimental-strip-types`.

export type AuthResult =
  | { ok: true }
  | { ok: false; status: 503 | 401 }

/**
 * Returns `{ ok: true }` only when the env secret is set AND the incoming
 * Authorization header exactly matches `Bearer <secret>`.
 *
 * Priority: env-missing (503) wins over header-mismatch (401). Chosen so the
 * route can cheaply refuse when diagnosis isn't configured without leaking
 * the existence of the endpoint to unauthenticated probers.
 */
export function validateDebugAuth(
  authHeader: string | null,
  secretFromEnv: string | undefined
): AuthResult {
  if (!secretFromEnv) {
    return { ok: false, status: 503 }
  }
  if (authHeader !== `Bearer ${secretFromEnv}`) {
    return { ok: false, status: 401 }
  }
  return { ok: true }
}

/**
 * Parses and clamps the `?seconds=N` query param for the sleep routes.
 * Default 75, clamped to [1, 180]. Non-numeric / missing / out-of-range
 * inputs all resolve to a safe value inside the range — the sleep routes
 * never trust the caller to send something sane.
 */
export function parseSleepSeconds(raw: string | null): number {
  if (raw === null) {
    // Spec default when ?seconds is omitted entirely (URLSearchParams.get
    // returns null). An explicit `?seconds=` (empty value) is treated as
    // non-numeric input and clamps to 1 via the parseInt branch below.
    return 75
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }
  if (parsed > 180) {
    return 180
  }
  return parsed
}

export type BlobUrlValidation =
  | { ok: true; url: URL }
  | { ok: false; reason: string }

/**
 * Validates that a string env value points to a Vercel Blob public URL.
 * Used by the edit-bench route to refuse arbitrary hostnames — the route
 * runs in production and is authenticated only by DEBUG_SECRET, so
 * hostname allowlisting closes the SSRF surface if the secret ever leaks.
 */
export function validateBlobUrl(raw: string | undefined): BlobUrlValidation {
  if (!raw) {
    return { ok: false, reason: 'empty' }
  }
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, reason: 'unparseable' }
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'not-https' }
  }
  // Must end with the Vercel Blob public domain. The trailing-dot check
  // prevents 'public.blob.vercel-storage.com.evil.com' from slipping through
  // a naive `.endsWith` check — we require a real subdomain delimiter.
  const host = parsed.hostname
  if (!host.endsWith('.public.blob.vercel-storage.com')) {
    return { ok: false, reason: 'wrong-host' }
  }
  return { ok: true, url: parsed }
}
