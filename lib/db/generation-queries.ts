import { and, count, eq, gte, isNotNull, lte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { generationJobs, images, usageLogs } from '@/lib/db/schema'

export async function createGenerationJobs(input: {
  groupId: string
  userId: string
  canvasId: string
  prompt: string
  aspectRatio: string
  quotaSource: 'platform' | 'byok'
  models: Array<{
    modelId: string
    provider: 'google' | 'bytedance' | 'alibaba' | '147ai'
  }>
}) {
  return db
    .insert(generationJobs)
    .values(
      input.models.map((model) => ({
        groupId: input.groupId,
        userId: input.userId,
        canvasId: input.canvasId,
        prompt: input.prompt,
        aspectRatio: input.aspectRatio,
        quotaSource: input.quotaSource,
        modelId: model.modelId,
        provider: model.provider,
      }))
    )
    .returning()
}

export async function markGenerationJobCompleted(
  jobId: string,
  userId: string,
  imageId: string,
  durationMs: number
) {
  const result = await db
    .update(generationJobs)
    .set({
      status: 'completed',
      imageId,
      durationMs,
      completedAt: new Date(),
    })
    .where(and(eq(generationJobs.id, jobId), eq(generationJobs.userId, userId)))
    .returning()

  return result[0] ?? null
}

export async function markGenerationJobFailed(
  jobId: string,
  userId: string,
  input: {
    errorCode: string
    error: string
    durationMs: number
  }
) {
  const result = await db
    .update(generationJobs)
    .set({
      status: 'failed',
      errorCode: input.errorCode,
      error: input.error,
      durationMs: input.durationMs,
      completedAt: new Date(),
    })
    .where(and(eq(generationJobs.id, jobId), eq(generationJobs.userId, userId)))
    .returning()

  return result[0] ?? null
}

export async function listRecentGenerationCountForUser(
  userId: string,
  since = new Date(Date.now() - 60_000)
) {
  const result = await db
    .select({ value: count() })
    .from(generationJobs)
    .where(
      and(eq(generationJobs.userId, userId), gte(generationJobs.createdAt, since))
    )

  return result[0]?.value ?? 0
}

export async function insertGeneratedImageResult(input: {
  userId: string
  canvasId: string
  groupId: string
  model: string
  provider: string
  prompt: string
  aspectRatio: string
  blobUrl: string
  sizeBytes: number
  durationMs: number
}) {
  const result = await db
    .insert(images)
    .values({
      userId: input.userId,
      type: 'generate',
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
      model: input.model,
      provider: input.provider,
      groupId: input.groupId,
      durationMs: input.durationMs,
      canvasId: input.canvasId,
      blobUrl: input.blobUrl,
      sizeBytes: input.sizeBytes,
    })
    .returning()

  return result[0]
}

/**
 * Atomic quota pre-deduction: insert N placeholder usageLogs rows BEFORE
 * generation starts. This prevents TOCTOU races where concurrent requests
 * both pass the quota check. On failure, call rollbackQuotaDeduction to
 * remove the placeholder rows.
 */
export async function preDeductQuota(input: {
  userId: string
  action: 'generate'
  models: Array<{ modelId: string; provider: string }>
  quotaSource: 'platform' | 'byok'
  groupId: string
  canvasId: string
}) {
  const rows = input.models.map((m) => ({
    userId: input.userId,
    action: input.action as 'generate' | 'edit',
    model: m.modelId,
    provider: m.provider,
    quotaSource: input.quotaSource,
    groupId: input.groupId,
    canvasId: input.canvasId,
    durationMs: 0, // placeholder, updated on completion
  }))

  return db.insert(usageLogs).values(rows).returning({ id: usageLogs.id })
}

/**
 * Rollback: delete pre-deducted usageLogs rows if generation fails to start.
 */
export async function rollbackQuotaDeduction(usageLogIds: string[]) {
  if (usageLogIds.length === 0) return
  for (const id of usageLogIds) {
    await db.delete(usageLogs).where(eq(usageLogs.id, id))
  }
}

export async function recordGenerationUsage(input: {
  userId: string
  action: 'generate' | 'edit'
  model: string
  provider: string
  quotaSource: 'platform' | 'byok'
  groupId: string
  durationMs: number
  canvasId: string
}) {
  const result = await db
    .insert(usageLogs)
    .values({
      userId: input.userId,
      action: input.action,
      model: input.model,
      provider: input.provider,
      quotaSource: input.quotaSource,
      groupId: input.groupId,
      durationMs: input.durationMs,
      canvasId: input.canvasId,
    })
    .returning()

  return result[0]
}

export async function listRecoverableGenerationJobsForCanvas(
  userId: string,
  canvasId: string,
  since = new Date(Date.now() - 24 * 60 * 60 * 1000)
) {
  return db
    .select({
      id: generationJobs.id,
      groupId: generationJobs.groupId,
      modelId: generationJobs.modelId,
      provider: generationJobs.provider,
      durationMs: generationJobs.durationMs,
      imageId: generationJobs.imageId,
      blobUrl: images.blobUrl,
      createdAt: generationJobs.createdAt,
    })
    .from(generationJobs)
    .innerJoin(images, eq(images.id, generationJobs.imageId))
    .where(
      and(
        eq(generationJobs.userId, userId),
        eq(generationJobs.canvasId, canvasId),
        eq(generationJobs.status, 'completed'),
        gte(generationJobs.createdAt, since),
        isNotNull(generationJobs.imageId)
      )
    )
    // ASC: replay results in original generation order (spec requirement)
    .orderBy(generationJobs.createdAt)
}

/**
 * Sweep zombie jobs: mark stale 'processing' jobs as 'failed'.
 * Call from a cron route or at canvas load time.
 */
export async function sweepZombieGenerationJobs(
  staleCutoff = new Date(Date.now() - 10 * 60 * 1000)
) {
  const result = await db
    .update(generationJobs)
    .set({
      status: 'failed',
      errorCode: 'timeout',
      error: 'Zombie job swept (processing > 10 minutes)',
      completedAt: new Date(),
    })
    .where(
      and(
        eq(generationJobs.status, 'processing'),
        lte(generationJobs.createdAt, staleCutoff)
      )
    )
    .returning({ id: generationJobs.id })

  return result.length
}

export type RecoverableGenerationJob = Awaited<
  ReturnType<typeof listRecoverableGenerationJobsForCanvas>
>[number]
