import { auth } from '@/lib/auth'
import { executeEditImage, validateEditInput } from '@/lib/image/edit'

export const maxDuration = 300
export const runtime = 'nodejs'

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError('Unauthorized', 401)
  }

  let raw: Record<string, unknown>
  try {
    raw = (await request.json()) as Record<string, unknown>
  } catch {
    return jsonError('Invalid request format', 400)
  }

  const validated = validateEditInput(raw)
  if (!validated.ok) {
    return jsonError(validated.error, 400)
  }

  const result = await executeEditImage({
    userId: session.user.id,
    input: validated.data,
  })

  if (!result.ok) {
    return jsonError(result.error, result.status)
  }

  return Response.json({
    success: true,
    groupId: result.groupId,
    results: result.results,
  })
}
