# P4: AI 异步任务架构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace synchronous AI API calls with an async task queue backed by Postgres, giving users immediate feedback on submit and reliable retry on failure.

**Architecture:** Server actions write to a `tasks` table and fire-and-forget trigger a worker API route. The worker uses CTE + FOR UPDATE SKIP LOCKED to atomically claim tasks, calls the AI API, uploads results, and updates task status. Frontend polls `getTaskStatus` every 3 seconds. Vercel Cron (Pro) or poll-time re-kicks (Hobby) provide fallback.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, Vercel Postgres, Vercel Blob, sonner (toasts)

---

## File Structure

**New files:**

| File | Responsibility |
|------|----------------|
| `lib/db/schema.ts` (modify) | Add `tasks` table definition |
| `lib/db/queries.ts` (modify) | Add task CRUD, atomic claim, zombie recovery, `recordUsageReturningId` |
| `lib/types.ts` (modify) | Add `TaskStatusResult` interface |
| `lib/trigger-worker.ts` | `triggerWorker()` fire-and-forget utility |
| `lib/task-worker.ts` | `processNextTask()` core execution engine |
| `app/actions/tasks.ts` | `getTaskStatus`, `getRecentPendingTask`, `retryTaskAction` |
| `app/api/worker/process/route.ts` | Worker API route (POST, auth by WORKER_SECRET) |
| `app/api/cron/process-tasks/route.ts` | Cron fallback route (GET, auth by CRON_SECRET) |
| `hooks/use-task-polling.ts` | `useTaskPolling(taskId)` client hook |
| `components/task-status.tsx` | Task status display (pending/processing/completed/failed) |
| `components/pending-task-banner.tsx` | Banner for resuming incomplete tasks |

**Modified files:**

| File | Change |
|------|--------|
| `app/actions/generate.ts` | Replace sync API call with task creation + triggerWorker |
| `app/actions/edit.ts` | Upload temp source images + task creation + triggerWorker |
| `components/scenario-form.tsx` | Use useTaskPolling + TaskStatus after submit |
| `components/generate-form.tsx` | Use useTaskPolling + TaskStatus after submit |
| `components/edit-form.tsx` | Use useTaskPolling + TaskStatus after submit, resume on mount |
| `components/generate-page-client.tsx` | Resume pending generate task on mount |

---

### Task 1: Add tasks table to Drizzle schema

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add tasks table and relations to schema**

Add after the `usageLogs` table definition in `lib/db/schema.ts`:

```typescript
// ============================================================
// tasks (async job queue)
// ============================================================
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<'generate' | 'edit'>().notNull(),
  status: text('status')
    .$type<'pending' | 'processing' | 'completed' | 'failed'>()
    .default('pending')
    .notNull(),
  payload: text('payload').notNull(), // JSON string
  result: text('result'), // JSON string, success only: { imageId, blobUrl }
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('maxAttempts').default(3).notNull(),
  lastError: text('lastError'),
  usageLogId: uuid('usageLogId').references(() => usageLogs.id),
  nextRetryAt: timestamp('nextRetryAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  completedAt: timestamp('completedAt', { mode: 'date' }),
})

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}))
```

Also add `tasks` to the existing `usersRelations`:

```typescript
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  images: many(images),
  usageLogs: many(usageLogs),
  tasks: many(tasks),
}))
```

Note: We use `text` for `payload` and `result` (JSON stored as string) because the Drizzle + Vercel Postgres driver doesn't always handle `jsonb` column type mapping cleanly. We'll `JSON.parse`/`JSON.stringify` in the query layer.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors)

- [ ] **Step 3: Generate and run the migration**

Run: `npx drizzle-kit generate`
Then: `npx drizzle-kit push`

If `drizzle-kit push` is used in this project (check `drizzle.config.ts`), use that instead of `migrate`. Verify the `tasks` table exists in the database.

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(p4): add tasks table schema for async job queue"
```

---

### Task 2: Add TaskStatusResult type

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add TaskStatusResult and task payload types**

Add at the end of `lib/types.ts`:

```typescript
export interface TaskStatusResult {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: { imageId: string; blobUrl: string }
  error?: string
  attempts: number
  maxAttempts: number
  createdAt: string
}

export interface GenerateTaskPayload {
  prompt: string
  aspectRatio: string
  quality: string
}

export interface EditTaskPayload {
  prompt: string
  sourceImageUrls: string[]
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(p4): add TaskStatusResult and task payload types"
```

---

### Task 3: Add task DB queries

**Files:**
- Modify: `lib/db/queries.ts`

- [ ] **Step 1: Add task query functions**

Add these imports at the top of `lib/db/queries.ts`:

```typescript
import { eq, gte, and, count, desc, lte, sql, or } from 'drizzle-orm'
// ... existing imports ...
import { users, images, usageLogs, tasks } from './schema'
```

Then add the following functions at the end of the file:

```typescript
export async function recordUsageReturningId(
  userId: string,
  action: 'generate' | 'edit'
): Promise<string> {
  const result = await db
    .insert(usageLogs)
    .values({ userId, action })
    .returning({ id: usageLogs.id })
  return result[0].id
}

export async function createTask(data: {
  userId: string
  type: 'generate' | 'edit'
  payload: string
  usageLogId: string
}): Promise<string> {
  const result = await db
    .insert(tasks)
    .values({
      userId: data.userId,
      type: data.type,
      payload: data.payload,
      usageLogId: data.usageLogId,
    })
    .returning({ id: tasks.id })
  return result[0].id
}

export async function getTaskById(
  taskId: string,
  userId: string
): Promise<typeof tasks.$inferSelect | null> {
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1)
  return result[0] ?? null
}

export async function getRecentPendingTaskByType(
  userId: string,
  type: 'generate' | 'edit'
): Promise<typeof tasks.$inferSelect | null> {
  const result = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.type, type),
        or(eq(tasks.status, 'pending'), eq(tasks.status, 'processing'))
      )
    )
    .orderBy(desc(tasks.createdAt))
    .limit(1)
  return result[0] ?? null
}

export async function claimNextTask(): Promise<typeof tasks.$inferSelect | null> {
  const result = await db.execute(sql`
    WITH next_task AS (
      SELECT id FROM tasks
      WHERE status = 'pending'
        AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= now())
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE tasks SET status = 'processing', "updatedAt" = now()
    FROM next_task WHERE tasks.id = next_task.id
    RETURNING tasks.*
  `)
  const row = result.rows[0]
  if (!row) return null

  return {
    id: row.id as string,
    userId: row.userId as string,
    type: row.type as 'generate' | 'edit',
    status: 'processing' as const,
    payload: row.payload as string,
    result: row.result as string | null,
    attempts: row.attempts as number,
    maxAttempts: row.maxAttempts as number,
    lastError: row.lastError as string | null,
    usageLogId: row.usageLogId as string | null,
    nextRetryAt: row.nextRetryAt ? new Date(row.nextRetryAt as string) : null,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
    completedAt: row.completedAt ? new Date(row.completedAt as string) : null,
  }
}

export async function markTaskCompleted(
  taskId: string,
  result: { imageId: string; blobUrl: string }
): Promise<void> {
  await db
    .update(tasks)
    .set({
      status: 'completed',
      result: JSON.stringify(result),
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
}

export async function markTaskRetryable(
  taskId: string,
  error: string,
  currentAttempts: number
): Promise<void> {
  const delaySeconds = 10 * Math.pow(3, currentAttempts) // 10s, 30s, 90s
  const nextRetryAt = new Date(Date.now() + delaySeconds * 1000)

  await db
    .update(tasks)
    .set({
      status: 'pending',
      attempts: currentAttempts + 1,
      lastError: error,
      nextRetryAt,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
}

export async function markTaskFailed(
  taskId: string,
  error: string,
  currentAttempts: number
): Promise<void> {
  await db
    .update(tasks)
    .set({
      status: 'failed',
      attempts: currentAttempts + 1,
      lastError: error,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
}

export async function resetTaskForRetry(
  taskId: string,
  newUsageLogId: string
): Promise<void> {
  await db
    .update(tasks)
    .set({
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      lastError: null,
      nextRetryAt: null,
      result: null,
      completedAt: null,
      usageLogId: newUsageLogId,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
}

export async function deleteUsageLog(usageLogId: string): Promise<void> {
  await db.delete(usageLogs).where(eq(usageLogs.id, usageLogId))
}

export async function recoverZombieTasks(): Promise<number> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  const zombies = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, 'processing'),
        lte(tasks.updatedAt, tenMinutesAgo)
      )
    )

  let recovered = 0
  for (const zombie of zombies) {
    const nextAttempts = zombie.attempts + 1
    if (nextAttempts >= zombie.maxAttempts) {
      await markTaskFailed(zombie.id, 'Worker timeout (zombie recovery)', zombie.attempts)
      if (zombie.usageLogId) {
        await deleteUsageLog(zombie.usageLogId)
      }
    } else {
      await markTaskRetryable(zombie.id, 'Worker timeout (zombie recovery)', zombie.attempts)
    }
    recovered++
  }

  return recovered
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/db/queries.ts
git commit -m "feat(p4): add task DB queries (create, claim, retry, zombie recovery)"
```

---

### Task 4: Create triggerWorker utility

**Files:**
- Create: `lib/trigger-worker.ts`

- [ ] **Step 1: Create the trigger utility**

Create `lib/trigger-worker.ts`:

```typescript
export function triggerWorker(): void {
  const base = process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  fetch(`${base}/api/worker/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WORKER_SECRET ?? ''}` },
    signal: AbortSignal.timeout(1000),
  }).catch(() => {
    // Silent: cron or poll-time re-kick will handle it
  })
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/trigger-worker.ts
git commit -m "feat(p4): add triggerWorker fire-and-forget utility"
```

---

### Task 5: Create task worker engine

**Files:**
- Create: `lib/task-worker.ts`

- [ ] **Step 1: Implement processNextTask**

Create `lib/task-worker.ts`:

```typescript
import { generateImage, editImage } from '@/lib/image-api'
import { uploadImage } from '@/lib/storage'
import { insertImage, claimNextTask, markTaskCompleted, markTaskRetryable, markTaskFailed, deleteUsageLog } from '@/lib/db/queries'
import { del } from '@vercel/blob'
import type { GenerateTaskPayload, EditTaskPayload } from '@/lib/types'

async function cleanupTempSources(sourceUrls: string[]): Promise<void> {
  for (const url of sourceUrls) {
    try {
      await del(url)
    } catch {
      // Non-fatal
    }
  }
}

async function executeTask(task: {
  id: string
  userId: string
  type: 'generate' | 'edit'
  payload: string
  attempts: number
  maxAttempts: number
  usageLogId: string | null
}): Promise<void> {
  let tempSourceUrls: string[] = []

  try {
    if (task.type === 'generate') {
      const payload = JSON.parse(task.payload) as GenerateTaskPayload
      const imageBuffer = await generateImage(payload.prompt, payload.aspectRatio, payload.quality)
      const { url } = await uploadImage(task.userId, imageBuffer)

      const record = await insertImage({
        userId: task.userId,
        type: 'generate',
        prompt: payload.prompt,
        aspectRatio: payload.aspectRatio,
        quality: payload.quality,
        blobUrl: url,
        sizeBytes: imageBuffer.length,
      })

      await markTaskCompleted(task.id, { imageId: record.id, blobUrl: url })
    } else {
      const payload = JSON.parse(task.payload) as EditTaskPayload
      tempSourceUrls = payload.sourceImageUrls

      const imageBuffers: Buffer[] = []
      for (const sourceUrl of payload.sourceImageUrls) {
        const response = await fetch(sourceUrl)
        const arrayBuffer = await response.arrayBuffer()
        imageBuffers.push(Buffer.from(arrayBuffer))
      }

      const resultBuffer = await editImage(payload.prompt, imageBuffers)
      const { url } = await uploadImage(task.userId, resultBuffer)

      const record = await insertImage({
        userId: task.userId,
        type: 'edit',
        prompt: payload.prompt,
        blobUrl: url,
        sizeBytes: resultBuffer.length,
        sourceImages: JSON.stringify(payload.sourceImageUrls.map((_, i) => `source-${i}.png`)),
      })

      await markTaskCompleted(task.id, { imageId: record.id, blobUrl: url })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const nextAttempts = task.attempts + 1

    if (nextAttempts < task.maxAttempts) {
      await markTaskRetryable(task.id, errorMessage, task.attempts)
    } else {
      await markTaskFailed(task.id, errorMessage, task.attempts)
      if (task.usageLogId) {
        await deleteUsageLog(task.usageLogId)
      }
    }
  } finally {
    if (tempSourceUrls.length > 0) {
      await cleanupTempSources(tempSourceUrls)
    }
  }
}

export async function processNextTask(): Promise<boolean> {
  const task = await claimNextTask()
  if (!task) return false

  await executeTask(task)
  return true
}

export async function runWorkerLoop(options: {
  maxTasks?: number
  maxDurationMs?: number
} = {}): Promise<number> {
  const maxTasks = options.maxTasks ?? 3
  const maxDurationMs = options.maxDurationMs ?? 4 * 60 * 1000 // 4 minutes
  const startTime = Date.now()
  let processed = 0

  while (processed < maxTasks && (Date.now() - startTime) < maxDurationMs) {
    const found = await processNextTask()
    if (!found) break
    processed++
  }

  return processed
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/task-worker.ts
git commit -m "feat(p4): add task worker engine with retry and cleanup"
```

---

### Task 6: Create worker API route

**Files:**
- Create: `app/api/worker/process/route.ts`

- [ ] **Step 1: Implement the worker route**

Create `app/api/worker/process/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { runWorkerLoop } from '@/lib/task-worker'

export const maxDuration = 300 // 5 minutes

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.WORKER_SECRET ?? ''}`

  if (!process.env.WORKER_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const processed = await runWorkerLoop({ maxTasks: 3, maxDurationMs: 4 * 60 * 1000 })

  return NextResponse.json({ processed })
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/worker/process/route.ts
git commit -m "feat(p4): add worker API route with auth"
```

---

### Task 7: Create cron fallback route

**Files:**
- Create: `app/api/cron/process-tasks/route.ts`

- [ ] **Step 1: Implement the cron route**

Create `app/api/cron/process-tasks/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { runWorkerLoop } from '@/lib/task-worker'
import { recoverZombieTasks } from '@/lib/db/queries'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recovered = await recoverZombieTasks()
  const processed = await runWorkerLoop({ maxTasks: 3, maxDurationMs: 4 * 60 * 1000 })

  return NextResponse.json({ recovered, processed })
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/process-tasks/route.ts
git commit -m "feat(p4): add cron fallback route with zombie recovery"
```

---

### Task 8: Create task server actions

**Files:**
- Create: `app/actions/tasks.ts`

- [ ] **Step 1: Implement getTaskStatus, getRecentPendingTask, retryTaskAction**

Create `app/actions/tasks.ts`:

```typescript
'use server'

import { auth } from '@/lib/auth'
import { getTaskById, getRecentPendingTaskByType, resetTaskForRetry, recordUsageReturningId, recoverZombieTasks } from '@/lib/db/queries'
import { checkQuota } from '@/lib/quota'
import { triggerWorker } from '@/lib/trigger-worker'
import type { ActionResult, TaskStatusResult } from '@/lib/types'

const PENDING_STALE_THRESHOLD_MS = 15 * 1000 // 15 seconds
const ZOMBIE_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

function shouldReKick(task: { status: string; createdAt: Date; updatedAt: Date }): boolean {
  const now = Date.now()

  if (task.status === 'pending' && now - task.createdAt.getTime() > PENDING_STALE_THRESHOLD_MS) {
    return true
  }

  if (task.status === 'processing' && now - task.updatedAt.getTime() > ZOMBIE_THRESHOLD_MS) {
    return true
  }

  return false
}

export async function getTaskStatus(
  taskId: string
): Promise<ActionResult<TaskStatusResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const task = await getTaskById(taskId, session.user.id)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    // Hobby fallback: re-kick worker if task appears stuck
    if (shouldReKick(task)) {
      if (task.status === 'processing') {
        await recoverZombieTasks()
      }
      triggerWorker()
    }

    const parsed = task.result ? JSON.parse(task.result) as { imageId: string; blobUrl: string } : undefined

    return {
      success: true,
      data: {
        status: task.status as TaskStatusResult['status'],
        result: parsed,
        error: task.lastError ?? undefined,
        attempts: task.attempts,
        maxAttempts: task.maxAttempts,
        createdAt: task.createdAt.toISOString(),
      },
    }
  } catch {
    return { success: false, error: 'Failed to get task status' }
  }
}

export async function getRecentPendingTask(
  type: 'generate' | 'edit'
): Promise<ActionResult<{ taskId: string } & TaskStatusResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const task = await getRecentPendingTaskByType(session.user.id, type)
    if (!task) {
      return { success: true, data: undefined }
    }

    // Re-kick worker to make sure task is being processed
    if (shouldReKick(task)) {
      if (task.status === 'processing') {
        await recoverZombieTasks()
      }
      triggerWorker()
    }

    return {
      success: true,
      data: {
        taskId: task.id,
        status: task.status as TaskStatusResult['status'],
        error: task.lastError ?? undefined,
        attempts: task.attempts,
        maxAttempts: task.maxAttempts,
        createdAt: task.createdAt.toISOString(),
      },
    }
  } catch {
    return { success: false, error: 'Failed to check pending tasks' }
  }
}

export async function retryTaskAction(
  taskId: string
): Promise<ActionResult<{ taskId: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const task = await getTaskById(taskId, session.user.id)
    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    if (task.status !== 'failed') {
      return { success: false, error: 'Only failed tasks can be retried' }
    }

    const quota = await checkQuota(session.user.id)
    if (!quota.allowed) {
      return {
        success: false,
        error: 'Quota exceeded',
        errorCode: 'quota_exceeded',
        quota: {
          dailyUsed: quota.dailyUsed,
          dailyLimit: quota.dailyLimit,
          monthlyUsed: quota.monthlyUsed,
          monthlyLimit: quota.monthlyLimit,
        },
      }
    }

    const usageLogId = await recordUsageReturningId(session.user.id, task.type as 'generate' | 'edit')
    await resetTaskForRetry(taskId, usageLogId)
    triggerWorker()

    return { success: true, data: { taskId } }
  } catch {
    return { success: false, error: 'Failed to retry task' }
  }
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/actions/tasks.ts
git commit -m "feat(p4): add task server actions (status, resume, retry)"
```

---

### Task 9: Refactor generateImageAction to async

**Files:**
- Modify: `app/actions/generate.ts`

- [ ] **Step 1: Replace sync API call with task creation**

Replace the entire contents of `app/actions/generate.ts`:

```typescript
'use server'

import { auth } from '@/lib/auth'
import { checkQuota } from '@/lib/quota'
import { createTask, recordUsageReturningId } from '@/lib/db/queries'
import { triggerWorker } from '@/lib/trigger-worker'
import type { ActionResult } from '@/lib/types'

interface SubmitResult {
  taskId: string
}

export async function generateImageAction(
  formData: FormData
): Promise<ActionResult<SubmitResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const prompt = formData.get('prompt') as string | null
    const aspectRatio = (formData.get('aspectRatio') as string) ?? '16:9'
    const quality = (formData.get('quality') as string) ?? '2K'

    if (!prompt?.trim()) {
      return { success: false, error: 'Prompt is required' }
    }

    const MAX_PROMPT_LENGTH = 2000
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return { success: false, error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer` }
    }

    const VALID_ASPECT_RATIOS = new Set(['1:1', '16:9', '9:16', '4:3', '3:4'])
    const VALID_QUALITIES = new Set(['1K', '2K', '4K'])
    if (!VALID_ASPECT_RATIOS.has(aspectRatio)) {
      return { success: false, error: 'Invalid aspect ratio' }
    }
    if (!VALID_QUALITIES.has(quality)) {
      return { success: false, error: 'Invalid quality value' }
    }

    const quota = await checkQuota(session.user.id)
    if (!quota.allowed) {
      return {
        success: false,
        error: 'Quota exceeded',
        errorCode: 'quota_exceeded' as const,
        quota: {
          dailyUsed: quota.dailyUsed,
          dailyLimit: quota.dailyLimit,
          monthlyUsed: quota.monthlyUsed,
          monthlyLimit: quota.monthlyLimit,
        },
      }
    }

    const usageLogId = await recordUsageReturningId(session.user.id, 'generate')

    const payload = JSON.stringify({ prompt, aspectRatio, quality })
    const taskId = await createTask({
      userId: session.user.id,
      type: 'generate',
      payload,
      usageLogId,
    })

    triggerWorker()

    return { success: true, data: { taskId } }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit task'
    return { success: false, error: message }
  }
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: May have errors in components that expect `{ imageUrl, imageId }` — these will be fixed in Tasks 12-14. Proceed.

- [ ] **Step 3: Commit**

```bash
git add app/actions/generate.ts
git commit -m "feat(p4): refactor generateImageAction to async task submission"
```

---

### Task 10: Refactor editImageAction to async

**Files:**
- Modify: `app/actions/edit.ts`

- [ ] **Step 1: Replace sync API call with task creation + temp source upload**

Replace the entire contents of `app/actions/edit.ts`:

```typescript
'use server'

import { auth } from '@/lib/auth'
import { checkQuota } from '@/lib/quota'
import { createTask, recordUsageReturningId } from '@/lib/db/queries'
import { triggerWorker } from '@/lib/trigger-worker'
import { put } from '@vercel/blob'
import type { ActionResult } from '@/lib/types'

interface SubmitResult {
  taskId: string
}

export async function editImageAction(
  formData: FormData
): Promise<ActionResult<SubmitResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required', errorCode: 'auth_required' }
    }

    const prompt = formData.get('prompt') as string | null
    const image1 = formData.get('image1') as File | null
    const image2 = formData.get('image2') as File | null

    if (!prompt?.trim()) {
      return { success: false, error: 'Prompt is required' }
    }

    const MAX_PROMPT_LENGTH = 2000
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return { success: false, error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer` }
    }

    if (!image1 || image1.size === 0) {
      return { success: false, error: 'At least one image is required' }
    }

    const MAX_SIZE = 10 * 1024 * 1024
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

    if (image1.size > MAX_SIZE) {
      return { success: false, error: 'Image 1 exceeds the 10 MB limit' }
    }
    if (!ALLOWED_TYPES.includes(image1.type)) {
      return { success: false, error: 'Unsupported image format. Use PNG, JPEG, WebP, or GIF' }
    }
    if (image2 && image2.size > 0) {
      if (image2.size > MAX_SIZE) {
        return { success: false, error: 'Image 2 exceeds the 10 MB limit' }
      }
      if (!ALLOWED_TYPES.includes(image2.type)) {
        return { success: false, error: 'Unsupported image format for image 2' }
      }
    }

    const quota = await checkQuota(session.user.id)
    if (!quota.allowed) {
      return {
        success: false,
        error: 'Quota exceeded',
        errorCode: 'quota_exceeded' as const,
        quota: {
          dailyUsed: quota.dailyUsed,
          dailyLimit: quota.dailyLimit,
          monthlyUsed: quota.monthlyUsed,
          monthlyLimit: quota.monthlyLimit,
        },
      }
    }

    // Generate a task ID early for temp path naming
    const tempId = crypto.randomUUID()
    const sourceImageUrls: string[] = []

    // Upload source images to temp blob storage
    const buffer1 = Buffer.from(await image1.arrayBuffer())
    const blob1 = await put(`temp/${session.user.id}/${tempId}/source-0.png`, buffer1, {
      access: 'public',
      contentType: image1.type,
    })
    sourceImageUrls.push(blob1.url)

    if (image2 && image2.size > 0) {
      const buffer2 = Buffer.from(await image2.arrayBuffer())
      const blob2 = await put(`temp/${session.user.id}/${tempId}/source-1.png`, buffer2, {
        access: 'public',
        contentType: image2.type,
      })
      sourceImageUrls.push(blob2.url)
    }

    const usageLogId = await recordUsageReturningId(session.user.id, 'edit')

    const payload = JSON.stringify({ prompt, sourceImageUrls })
    const taskId = await createTask({
      userId: session.user.id,
      type: 'edit',
      payload,
      usageLogId,
    })

    triggerWorker()

    return { success: true, data: { taskId } }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit task'
    return { success: false, error: message }
  }
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: May have errors in edit-form.tsx — will be fixed in Task 14.

- [ ] **Step 3: Commit**

```bash
git add app/actions/edit.ts
git commit -m "feat(p4): refactor editImageAction to async with temp source upload"
```

---

### Task 11: Create useTaskPolling hook

**Files:**
- Create: `hooks/use-task-polling.ts`

- [ ] **Step 1: Implement the polling hook**

Create `hooks/use-task-polling.ts`:

```typescript
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getTaskStatus } from '@/app/actions/tasks'
import type { TaskStatusResult } from '@/lib/types'

const POLL_INTERVAL_MS = 3000

interface UseTaskPollingReturn {
  status: TaskStatusResult['status'] | null
  result?: { imageId: string; blobUrl: string }
  error?: string
  attempts: number
  maxAttempts: number
  elapsed: number
  isPolling: boolean
}

export function useTaskPolling(taskId: string | null): UseTaskPollingReturn {
  const [data, setData] = useState<TaskStatusResult | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    if (!taskId) return
    const res = await getTaskStatus(taskId)
    if (res.success && res.data) {
      setData(res.data)
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        setIsPolling(false)
      }
    }
  }, [taskId])

  // Start/stop polling when taskId changes
  useEffect(() => {
    if (!taskId) {
      setIsPolling(false)
      setData(null)
      setElapsed(0)
      return
    }

    setIsPolling(true)
    // Poll immediately
    void poll()

    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void poll()
    }, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [taskId, poll])

  // Stop interval when polling ends
  useEffect(() => {
    if (!isPolling && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [isPolling])

  // Elapsed timer based on createdAt
  useEffect(() => {
    if (!data?.createdAt || data.status === 'completed' || data.status === 'failed') {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
      return
    }

    const createdAtMs = new Date(data.createdAt).getTime()

    function tick() {
      setElapsed(Math.floor((Date.now() - createdAtMs) / 1000))
    }

    tick()
    elapsedRef.current = setInterval(tick, 1000)

    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [data?.createdAt, data?.status])

  // Resume polling on visibility change
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && isPolling) {
        void poll()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isPolling, poll])

  return {
    status: data?.status ?? null,
    result: data?.result,
    error: data?.error,
    attempts: data?.attempts ?? 0,
    maxAttempts: data?.maxAttempts ?? 3,
    elapsed,
    isPolling,
  }
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add hooks/use-task-polling.ts
git commit -m "feat(p4): add useTaskPolling hook with visibility pause"
```

---

### Task 12: Create TaskStatus and PendingTaskBanner components

**Files:**
- Create: `components/task-status.tsx`
- Create: `components/pending-task-banner.tsx`

- [ ] **Step 1: Create TaskStatus component**

Create `components/task-status.tsx`:

```typescript
'use client'

import { Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PostActions } from '@/components/post-actions'
import { useLocale } from '@/components/locale-provider'

interface TaskStatusProps {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: { imageId: string; blobUrl: string }
  error?: string
  elapsed: number
  attempts: number
  maxAttempts: number
  prompt: string
  isUploadType: boolean
  editIntent: string
  onRetry: () => void
  retrying?: boolean
}

export function TaskStatus({
  status,
  result,
  error,
  elapsed,
  attempts,
  prompt,
  isUploadType,
  editIntent,
  onRetry,
  retrying,
}: TaskStatusProps) {
  const { locale } = useLocale()

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/50 p-8 text-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {locale === 'zh' ? '排队中...' : 'Queued...'}
        </p>
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/50 p-8 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">
          {locale === 'zh' ? `生成中... ${elapsed}s` : `Generating... ${elapsed}s`}
        </p>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">
              {locale === 'zh' ? '生成失败' : 'Generation failed'}
            </p>
            {error && (
              <p className="text-xs text-destructive/80">{error}</p>
            )}
            {attempts > 0 && (
              <p className="text-xs text-muted-foreground">
                {locale === 'zh'
                  ? `已自动重试 ${attempts} 次`
                  : `Auto-retried ${attempts} time${attempts > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onRetry}
          disabled={retrying}
        >
          <RefreshCw className="size-3.5" />
          {locale === 'zh' ? '重试' : 'Retry'}
        </Button>
      </div>
    )
  }

  if (status === 'completed' && result) {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.blobUrl} alt="Generated" className="w-full object-contain" />
        </div>
        <PostActions
          imageUrl={result.blobUrl}
          imageId={result.imageId}
          prompt={prompt}
          isUploadType={isUploadType}
          editIntent={editIntent}
          onRetry={onRetry}
          retrying={retrying}
        />
      </div>
    )
  }

  return null
}
```

- [ ] **Step 2: Create PendingTaskBanner component**

Create `components/pending-task-banner.tsx`:

```typescript
'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { getRecentPendingTask } from '@/app/actions/tasks'
import { useLocale } from '@/components/locale-provider'
import { useTaskPolling } from '@/hooks/use-task-polling'

interface PendingTaskBannerProps {
  taskType: 'generate' | 'edit'
  onTaskFound: (taskId: string) => void
}

export function PendingTaskBanner({ taskType, onTaskFound }: PendingTaskBannerProps) {
  const { locale } = useLocale()
  const [checking, setChecking] = useState(true)
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
  const polling = useTaskPolling(pendingTaskId)

  useEffect(() => {
    async function check() {
      const res = await getRecentPendingTask(taskType)
      if (res.success && res.data?.taskId) {
        setPendingTaskId(res.data.taskId)
        onTaskFound(res.data.taskId)
      }
      setChecking(false)
    }
    void check()
  }, [taskType, onTaskFound])

  if (checking || !pendingTaskId) return null

  // Once completed or failed, the parent component should take over rendering
  if (polling.status === 'completed' || polling.status === 'failed') return null

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
      <Loader2 className="size-4 animate-spin text-primary" />
      <span>
        {locale === 'zh'
          ? `有一个任务正在${polling.status === 'pending' ? '排队' : '生成'}中... ${polling.elapsed}s`
          : `A task is ${polling.status === 'pending' ? 'queued' : 'generating'}... ${polling.elapsed}s`}
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/task-status.tsx components/pending-task-banner.tsx
git commit -m "feat(p4): add TaskStatus and PendingTaskBanner components"
```

---

### Task 13: Integrate async into ScenarioForm and GenerateForm

**Files:**
- Modify: `components/scenario-form.tsx`
- Modify: `components/generate-form.tsx`

- [ ] **Step 1: Update ScenarioForm to use task polling**

In `components/scenario-form.tsx`, make these changes:

1. Add imports at the top:
```typescript
import { useTaskPolling } from '@/hooks/use-task-polling'
import { TaskStatus } from '@/components/task-status'
import { retryTaskAction } from '@/app/actions/tasks'
```

2. Replace the `GenerateResult` interface and `result` state. Remove the `elapsed` state and the elapsed timer `useEffect`. Add `taskId` state:

Replace:
```typescript
interface GenerateResult {
  imageUrl: string
  imageId: string
}
```
with:
```typescript
interface SubmitResult {
  taskId: string
}
```

Replace:
```typescript
  const [result, setResult] = useState<ActionResult<GenerateResult> | null>(null)
  const [elapsed, setElapsed] = useState(0)
```
with:
```typescript
  const [submitResult, setSubmitResult] = useState<ActionResult<SubmitResult> | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const polling = useTaskPolling(taskId)
```

3. Remove the elapsed timer useEffect (the one with `if (!isPending) return` and `setInterval`).

4. Update `handleSubmit` — both branches should set `taskId` on success:

Replace the contents of both `startTransition` callbacks. For the upload branch:
```typescript
    if (scenario.inputType === 'upload') {
      if (files[0]) formData.set('image1', files[0].file)
      startTransition(async () => {
        const res = await editImageAction(formData)
        if (res.errorCode === 'quota_exceeded' && res.quota) {
          showQuotaError(locale, res.quota)
          return
        }
        setSubmitResult(res)
        if (res.success && res.data) {
          setTaskId(res.data.taskId)
        }
      })
    } else {
      formData.set('aspectRatio', aspectRatio)
      formData.set('quality', quality)
      startTransition(async () => {
        const res = await generateImageAction(formData)
        if (res.errorCode === 'quota_exceeded' && res.quota) {
          showQuotaError(locale, res.quota)
          return
        }
        setSubmitResult(res)
        if (res.success && res.data) {
          setTaskId(res.data.taskId)
        }
      })
    }
```

5. Update `handleRetry` to use `retryTaskAction`:
```typescript
  function handleRetry() {
    if (!taskId) return
    startTransition(async () => {
      const res = await retryTaskAction(taskId)
      if (res.errorCode === 'quota_exceeded' && res.quota) {
        showQuotaError(locale, res.quota)
        return
      }
      if (res.success) {
        // retryTaskAction resets the task, polling will resume automatically
      }
    })
  }
```

6. Replace the result view section. Replace:
```typescript
  if (result?.success && result.data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-3.5" />
          {t.backToScenarios}
        </Button>
        <div className="overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.data.imageUrl} alt="Generated" className="w-full object-contain" />
        </div>
        <PostActions
          imageUrl={result.data.imageUrl}
          imageId={result.data.imageId}
          prompt={buildPrompt(scenario, description, selectedStyle)}
          isUploadType={isUpload}
          editIntent={scenario.editIntent}
          onRetry={handleRetry}
          retrying={isPending}
        />
      </div>
    )
  }
```
with:
```typescript
  if (taskId && polling.status) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-3.5" />
          {t.backToScenarios}
        </Button>
        <TaskStatus
          status={polling.status}
          result={polling.result}
          error={polling.error}
          elapsed={polling.elapsed}
          attempts={polling.attempts}
          maxAttempts={polling.maxAttempts}
          prompt={buildPrompt(scenario, description, selectedStyle)}
          isUploadType={isUpload}
          editIntent={scenario.editIntent}
          onRetry={handleRetry}
          retrying={isPending}
        />
      </div>
    )
  }
```

7. Replace the error display section. Replace:
```typescript
      {result && !result.success && result.errorCode !== 'quota_exceeded' && (
```
with:
```typescript
      {submitResult && !submitResult.success && submitResult.errorCode !== 'quota_exceeded' && (
```
And change `{result.error}` to `{submitResult.error}`.

8. In the submit button, change `{t.generatingButton} {elapsed}s` to just `{t.generatingButton}`.

9. Remove the `PostActions` and `RefineDialog` imports if no longer needed (PostActions is now used via TaskStatus). Keep `RefineDialog` import — it's still used in the form.

- [ ] **Step 2: Update GenerateForm similarly**

Apply the same pattern to `components/generate-form.tsx`. The changes are analogous:
- Replace `GenerateResult` with `SubmitResult`
- Replace `result` state with `submitResult` + `taskId` + `useTaskPolling`
- Remove elapsed timer useEffect
- Update handleSubmit to set taskId
- Update handleRetry to use retryTaskAction
- Replace result view with TaskStatus
- Update error display to use submitResult

The GenerateForm uses `generateImageAction` only (no edit branch), so it's simpler.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (or errors only in edit-form.tsx, fixed in next task)

- [ ] **Step 4: Commit**

```bash
git add components/scenario-form.tsx components/generate-form.tsx
git commit -m "feat(p4): integrate async task polling into ScenarioForm and GenerateForm"
```

---

### Task 14: Integrate async into EditForm

**Files:**
- Modify: `components/edit-form.tsx`

- [ ] **Step 1: Update EditForm to use task polling**

Apply the same async pattern as Task 13, but for `components/edit-form.tsx`:

1. Add imports:
```typescript
import { useTaskPolling } from '@/hooks/use-task-polling'
import { TaskStatus } from '@/components/task-status'
import { retryTaskAction } from '@/app/actions/tasks'
```

2. Replace `EditResult` with `SubmitResult`:
```typescript
interface SubmitResult {
  taskId: string
}
```

3. Replace `result` state + `elapsed` state:
```typescript
  const [submitResult, setSubmitResult] = useState<ActionResult<SubmitResult> | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const polling = useTaskPolling(taskId)
```

4. Remove the elapsed timer useEffect (the `if (!isPending) return` one).

5. Update `handleRetry`:
```typescript
  function handleRetry() {
    if (!taskId) return
    startTransition(async () => {
      const res = await retryTaskAction(taskId)
      if (res.errorCode === 'quota_exceeded' && res.quota) {
        showQuotaError(locale, res.quota)
      }
    })
  }
```

6. Update `handleSubmit`:
```typescript
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    if (files[0]) {
      formData.set('image1', files[0].file)
    }
    if (files[1]) {
      formData.set('image2', files[1].file)
    }

    startTransition(async () => {
      const res = await editImageAction(formData)
      if (res.errorCode === 'quota_exceeded' && res.quota) {
        showQuotaError(locale, res.quota)
        return
      }
      setSubmitResult(res)
      if (res.success && res.data) {
        setTaskId(res.data.taskId)
      }
    })
  }
```

7. Replace the result display at the bottom. Replace:
```typescript
      {result?.success && result.data && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.data.imageUrl} alt="Edited image" className="w-full object-contain" />
          </div>
          <PostActions ... />
        </div>
      )}
```
with:
```typescript
      {taskId && polling.status && (
        <TaskStatus
          status={polling.status}
          result={polling.result}
          error={polling.error}
          elapsed={polling.elapsed}
          attempts={polling.attempts}
          maxAttempts={polling.maxAttempts}
          prompt={prompt}
          isUploadType={true}
          editIntent="保留主体，优化背景和光线"
          onRetry={handleRetry}
          retrying={isPending}
        />
      )}
```

8. Update the error display to use `submitResult` instead of `result`.

9. In the submit button, change `Editing... {elapsed}s` to just `Editing...`.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/edit-form.tsx
git commit -m "feat(p4): integrate async task polling into EditForm"
```

---

### Task 15: Add task resume via PendingTaskBanner

**Files:**
- Modify: `components/generate-page-client.tsx`
- Modify: `components/edit-form.tsx`

- [ ] **Step 1: Add PendingTaskBanner to GeneratePageClient**

In `components/generate-page-client.tsx`:

1. Add import:
```typescript
import { PendingTaskBanner } from '@/components/pending-task-banner'
```

2. Add a `useCallback` import and a resumedTaskId state:
```typescript
import { useState, useEffect, useCallback } from 'react'
// ...
const [resumedTaskId, setResumedTaskId] = useState<string | null>(null)
```

3. Add the banner before the main content. In the final return (the scenario grid view), add it at the top of the outer div:

```typescript
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PendingTaskBanner taskType="generate" onTaskFound={useCallback((id: string) => setResumedTaskId(id), [])} />
      <div className="space-y-1">
        ...
```

Note: The `PendingTaskBanner` is a self-contained component. When a pending task exists, it shows the status. The `onTaskFound` callback can be used by the parent to track which task was found, but the banner handles its own polling.

Actually, for simplicity, we can make `PendingTaskBanner` fully self-contained and not need the callback. Instead, let's simplify: the banner just shows a status bar. No callback needed.

Simplified approach — just render the banner at the top:

```typescript
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PendingTaskBanner taskType="generate" onTaskFound={setResumedTaskId} />
      <div className="space-y-1">
```

- [ ] **Step 2: Add PendingTaskBanner to EditForm**

In `components/edit-form.tsx`, add the banner at the top of the returned JSX (inside `<div className="space-y-6">`):

```typescript
import { PendingTaskBanner } from '@/components/pending-task-banner'
// ...

  return (
    <div className="space-y-6">
      <PendingTaskBanner taskType="edit" onTaskFound={setTaskId} />
      <form onSubmit={handleSubmit} className="space-y-6">
```

When a pending edit task is found, it sets the `taskId`, which triggers the polling hook already present in EditForm.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/generate-page-client.tsx components/edit-form.tsx
git commit -m "feat(p4): add PendingTaskBanner for task resume on page load"
```

---

### Task 16: Build verification and final cleanup

**Files:**
- None new — just verification

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors

- [ ] **Step 2: Run full build**

Run: `npx next build`
Expected: Build succeeds. All routes render correctly.

- [ ] **Step 3: Fix any build errors**

If there are type errors or build failures, fix them. Common issues:
- Import paths that don't match the actual file locations
- Missing `'use client'` directives on hook files
- Type mismatches between old interfaces and new `SubmitResult`

- [ ] **Step 4: Run existing tests**

Run: `node --test lib/edit-source.test.ts lib/gallery.test.ts lib/i18n.test.ts`
Expected: All existing tests pass (they don't test the new async code, but should not be broken).

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(p4): resolve build errors from async task migration"
```

---

## Self-Review

**Spec coverage check:**
- [x] Section 1 (tasks table) → Task 1
- [x] Section 2 (submit flow, triggerWorker, quota, temp source upload) → Tasks 4, 9, 10
- [x] Section 3 (worker engine, retry, zombie recovery) → Tasks 5, 6, 7
- [x] Section 4 (frontend UI, polling, banner, retry) → Tasks 11, 12, 13, 14, 15
- [x] Section 5 (API routes, actions, auth) → Tasks 6, 7, 8
- [x] Section 6 (file inventory) → All tasks match

**Spec constraints verified:**
- [x] updatedAt manually set in every status transition (queries.ts)
- [x] result only for success, lastError only for failure (queries.ts)
- [x] Status flow: pending → processing → completed/failed (queries.ts)
- [x] CTE + FOR UPDATE SKIP LOCKED (claimNextTask)
- [x] Worker 3 tasks / 4 min limit (runWorkerLoop)
- [x] WORKER_SECRET / CRON_SECRET auth on routes
- [x] Hobby fallback: re-kick in getTaskStatus and getRecentPendingTask
- [x] retryTaskAction: only failed, check quota, new usageLogId
- [x] getRecentPendingTask(type): userId from session
- [x] Temp source cleanup in finally block
- [x] Usage refund on final failure (deleteUsageLog)
- [x] PendingTaskBanner at generate-page-client and edit-form top, not NavBar
