# P4: AI 异步任务架构 — Design Spec

## 目标

将 Leo Image Studio 的图片生成/编辑从同步阻塞调用改为异步任务架构，提升用户体验（提交即返回、后台执行、状态轮询）和可靠性（失败自动重试、僵尸任务回收）。

## 架构概览

**方案：即时触发 + Cron 兜底**

```
用户提交
  → Server Action: 验证 + 扣配额 + 写 tasks 表(pending) + fire-and-forget 触发 worker
  → 立即返回 taskId
  → 前端轮询 getTaskStatus(taskId) 每 3 秒

Worker（/api/worker/process）:
  → 原子抢任务(CTE + FOR UPDATE SKIP LOCKED)
  → 调 AI API → 上传 blob → 写 images 表 → 更新 task(completed)
  → 失败: 可重试则 pending + nextRetryAt，最终失败则 failed + 退配额
  → 循环抢下一个，直到队列空或达上限

Cron 兜底（仅 Pro，1 分钟）:
  → 同一个 processNextTask() 逻辑
  → 额外: 僵尸任务回收
```

## 决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 驱动力 | 用户体验 + 可靠性 | 多模型延后 |
| 通知方式 | 轮询（3 秒） | Vercel Serverless 友好，图片生成耗时长，轮询足够 |
| 重试策略 | 自动 3 次 + 用户手动 | 覆盖临时错误，最终失败交用户决定 |
| 队列实现 | Postgres 数据库队列 | 不引入新依赖，量级匹配 |
| 回访体验 | Gallery + 页面顶部提示条 | 不新增页面，YAGNI |
| 同步/异步 | 全部异步 | 统一架构，不维护两套流程 |

---

## Section 1: tasks 表

```sql
CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,  -- 'generate' | 'edit'
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'processing' | 'completed' | 'failed'
  payload       JSONB NOT NULL,
  result        JSONB,          -- 仅成功时: { imageId, blobUrl }
  attempts      INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 3,
  last_error    TEXT,
  usage_log_id  UUID REFERENCES usage_logs(id),
  next_retry_at TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP NOT NULL DEFAULT now(),
  completed_at  TIMESTAMP
);

CREATE INDEX idx_tasks_status_retry ON tasks(status, next_retry_at);
CREATE INDEX idx_tasks_user_created ON tasks(user_id, created_at);
```

**payload 结构：**
- generate: `{ prompt: string, aspectRatio: string, quality: string }`
- edit: `{ prompt: string, sourceImageUrls: string[] }`

**约束：**

1. **updatedAt 手动更新** — 每次状态流转、重试调度、写入 result/lastError 时，代码显式设置 `updatedAt = new Date()`，不依赖触发器。

2. **result vs lastError 分离** — `result` 只存成功结果（`{ imageId, blobUrl }`）。失败只看 `lastError`。成功时 `lastError` 保留最后一次重试错误（如有），方便排查。

3. **状态流转规则：**
   - 可重试失败：`processing → pending`，写 `lastError`，`attempts++`，计算 `nextRetryAt`
   - 最终失败：`attempts >= maxAttempts` 时 `processing → failed`，写 `lastError`，`completedAt = now()`
   - `processing` 仅表示 worker 当前正在执行

4. **索引：**
   - `idx_tasks_status_retry(status, next_retry_at)` — worker 拉取待处理/待重试任务
   - `idx_tasks_user_created(user_id, created_at)` — 用户侧查询

---

## Section 2: 任务提交流程

**Server Action 改造（generateImageAction / editImageAction）：**

1. 验证 session + 输入 + 配额检查（和现在相同）
2. Edit 场景：源图片上传到 Vercel Blob 临时路径 `temp/{userId}/{taskId}/source-{n}.png`，拿到 URL 存入 payload
3. 写入 `tasks` 表（status=pending）
4. 扣配额（`recordUsage`）— 只扣一次，worker 重试不重复扣配额。将 usageLog.id 写入 task.usageLogId
5. Fire-and-forget 触发 worker（加速器，非唯一机制）：调用 `triggerWorker()` 工具函数
   ```typescript
   // lib/trigger-worker.ts
   export function triggerWorker(): void {
     const base = process.env.APP_URL ?? `https://${process.env.VERCEL_URL}`
     fetch(`${base}/api/worker/process`, {
       method: 'POST',
       headers: { Authorization: `Bearer ${process.env.WORKER_SECRET}` },
       signal: AbortSignal.timeout(1000),
     }).catch(() => {})  // 失败静默，轮询兜底
   }
   ```
   - 使用 server-only 的 `APP_URL`（手动配置）或 `VERCEL_URL`（Vercel 自动注入），不使用 `NEXT_PUBLIC_*`
   - 抽象为 `triggerWorker()` 函数，所有触发点（提交、轮询兜底、重试）统一调用
6. 返回 `{ success: true, data: { taskId } }`

**Worker 兜底启动机制：**
- fire-and-forget 只是加速器，不是唯一启动方式
- Vercel Cron（Pro 环境）每 1 分钟触发兜底
- Hobby 环境（无 Cron，轮询即兜底）：
  - `getTaskStatus` 被调用时，如果发现当前任务 `status='processing' AND updatedAt < now() - 10min`，直接执行僵尸回收 + 调用 `triggerWorker()`
  - `getTaskStatus` 被调用时，如果发现当前任务 `status='pending' AND createdAt < now() - 15s`（fire-and-forget 可能没打到），也调用 `triggerWorker()` re-kick
  - `getRecentPendingTask` 同理：返回 pending/processing 任务时，顺带调用 `triggerWorker()` 确保有 worker 在跑
- Worker 每次处理完一个任务后继续抢下一个（循环直到空或达上限）

**Elapsed 数据来源：**
- `getTaskStatus` 返回 `createdAt` 字段
- 前端用 `Date.now() - new Date(createdAt).getTime()` 计算 elapsed
- 刷新页面后时间仍准确

**任务恢复路径（用户关页再回来）：**
- Generate/Edit 客户端组件 mount 时调用 `getRecentPendingTask(type)`（userId 从 session 推断，不从客户端传，防 IDOR）
- 查询：`WHERE userId = session.user.id AND type = ? AND status IN ('pending', 'processing') ORDER BY createdAt DESC LIMIT 1`
- 如果存在，自动恢复轮询
- 不依赖 URL 参数或 localStorage，只从 DB 查

**单次扣费规则：**
- 提交时扣 1 次配额
- Worker 重试不重复扣配额
- 最终失败退还配额：`DELETE FROM usageLogs WHERE id = task.usageLogId`

**Edit 临时源图清理：**
- 任务成功/最终失败后：删除 `temp/{userId}/{taskId}/` 下的临时源图
- 在 worker 的 finally 逻辑中执行（成功/失败都走）

---

## Section 3: Worker 执行引擎

**核心函数：** `processNextTask()` 在 `lib/task-worker.ts`，worker route 和 cron route 共用。

**原子抢任务（CTE + FOR UPDATE SKIP LOCKED）：**
```sql
WITH next_task AS (
  SELECT id FROM tasks
  WHERE status = 'pending'
    AND (next_retry_at IS NULL OR next_retry_at <= now())
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE tasks SET status = 'processing', updated_at = now()
FROM next_task WHERE tasks.id = next_task.id
RETURNING tasks.*
```

**执行顺序：**
1. 抢任务
2. 根据 `task.type` 调用 `generateImage()` / `editImage()`（复用 `lib/image-api.ts`）
3. 上传 blob（`uploadImage`）
4. 写 images 表（`insertImage`）
5. 更新 task：status=completed, result={imageId, blobUrl}, completedAt=now(), updatedAt=now()
6. 清理临时源图（edit 场景）
7. 允许少量 orphan blob（步骤 3 成功但 4/5 失败时），后续清理任务兜底

**重试逻辑（失败时）：**
```
if (attempts + 1 < maxAttempts) {
  status = 'pending'
  attempts = attempts + 1
  lastError = errorMessage
  nextRetryAt = now() + delay
  updatedAt = now()
  // 指数退避: delay = 10 * 3^attempts 秒 → 10s, 30s, 90s
} else {
  status = 'failed'
  attempts = attempts + 1
  lastError = errorMessage
  completedAt = now()
  updatedAt = now()
  DELETE FROM usageLogs WHERE id = task.usageLogId  // 精确退款
  清理临时源图
}
```

**Worker Route 约束：**
- 鉴权：`Authorization: Bearer ${WORKER_SECRET}`，不匹配返回 401
- 单次上限：最多处理 3 个任务或运行 4 分钟（取先到），然后退出
- 循环：处理完一个后继续抢下一个，直到队列空或达上限

**Cron Route 约束：**
- 鉴权：`Authorization: Bearer ${CRON_SECRET}`
- 同一个 `processNextTask()` 函数，同样受 3 个/4 分钟上限
- 额外：僵尸回收

**僵尸任务回收：**
- 条件：`status = 'processing' AND updatedAt < now() - 10min`
- 回收时 `attempts = attempts + 1`，写 `lastError = 'Worker timeout (zombie recovery)'`
- 如果 `attempts >= maxAttempts`：直接置 `failed` + 退款 + 清理
- 否则：置 `pending`，计算 `nextRetryAt`

---

## Section 4: 前端任务状态 UI

**getTaskStatus 返回结构：**
```typescript
interface TaskStatusResult {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: { imageId: string; blobUrl: string }
  error?: string        // lastError
  attempts: number
  maxAttempts: number
  createdAt: string     // ISO timestamp
}
```

**useTaskPolling(taskId) hook：**
- 每 3 秒调用 `getTaskStatus` server action
- 返回 `{ status, result, error, elapsed, attempts, maxAttempts, isPolling }`
- 终态（completed / failed）自动停止轮询
- 组件卸载时清理 interval
- `document.visibilityState === 'hidden'` 时暂停轮询，可见时恢复

**TaskStatus 组件（状态显示）：**
- `pending` → "排队中..."
- `processing` → "生成中... {elapsed}s"
- `completed` → 显示结果图 + PostActions（复用现有组件）
- `failed` → "生成失败：{lastError}" + 重试按钮 + 已重试次数

**PendingTaskBanner 组件（回访提示）：**
- 挂在 `generate-page-client.tsx` 和 `edit-form.tsx` 容器顶部
- 不放全局 NavBar
- 只在存在最近未完成任务时渲染
- 显示当前状态 + 自动恢复轮询

**手动重试（retryTaskAction）：**
- 前置条件：只允许 `status = 'failed'`，校验 userId，重新配额检查
- 重置：status=pending, attempts=0, maxAttempts=3, lastError=null, nextRetryAt=null
- 重新扣配额（recordUsage），写入新 usageLogId
- 触发 worker + 恢复轮询

---

## Section 5: API Route + 安全

**新增 Route：**

| Route | 方法 | 鉴权 | 用途 |
|-------|------|------|------|
| `/api/worker/process` | POST | `Authorization: Bearer ${WORKER_SECRET}` | Worker 执行任务 |
| `/api/cron/process-tasks` | GET | `Authorization: Bearer ${CRON_SECRET}` | Cron 兜底（仅 Pro） |

**新增 Server Actions（app/actions/tasks.ts）：**

| Action | 用途 |
|--------|------|
| `getTaskStatus(taskId)` | 轮询查状态，带 userId 校验防 IDOR |
| `getRecentPendingTask(type)` | 查最近未完成任务，用于恢复 |
| `retryTaskAction(taskId)` | 手动重试，前置校验 + 重新扣配额 |

**改造 Server Actions：**

| Action | 改动 |
|--------|------|
| `generateImageAction` | 不再调 API，写 task + 触发 worker |
| `editImageAction` | 上传临时源图 + 写 task + 触发 worker |

**Cron 策略：**
- 实时主链路始终靠 fire-and-forget 触发 worker，不依赖 Cron
- **Hobby 环境**：无 Cron。`getTaskStatus` 和 `getRecentPendingTask` 负责兜底：发现 pending 超 15s 或 processing 僵尸时调用 `triggerWorker()` re-kick
- **Pro 环境**：配 `*/1 * * * *` Cron 兜底 + 僵尸回收

**环境变量：**
- `WORKER_SECRET` — worker route 鉴权
- `CRON_SECRET` — cron route 鉴权
- `APP_URL` — 服务端内部调用基础地址（可选，缺省用 `VERCEL_URL`）

---

## Section 6: 文件变动总览

**新增文件：**

| 文件 | 职责 |
|------|------|
| `lib/task-worker.ts` | `processNextTask()` 核心执行逻辑 |
| `lib/trigger-worker.ts` | `triggerWorker()` fire-and-forget 触发函数 |
| `app/actions/tasks.ts` | getTaskStatus、getRecentPendingTask、retryTaskAction |
| `app/api/worker/process/route.ts` | Worker API route |
| `app/api/cron/process-tasks/route.ts` | Cron 兜底 route（仅 Pro） |
| `hooks/use-task-polling.ts` | 前端轮询 hook |
| `components/task-status.tsx` | 任务状态 UI 组件 |
| `components/pending-task-banner.tsx` | 未完成任务提示条 |

**修改文件：**

| 文件 | 改动 |
|------|------|
| `lib/db/schema.ts` | 新增 tasks 表 schema |
| `lib/db/queries.ts` | 新增 task CRUD、原子抢任务、僵尸回收查询 |
| `app/actions/generate.ts` | 不再调 API，写 task + 触发 worker |
| `app/actions/edit.ts` | 上传临时源图 + 写 task + 触发 worker |
| `components/generate-form.tsx` | 提交后用 useTaskPolling + TaskStatus |
| `components/edit-form.tsx` | 同上 + mount 时检查未完成 edit 任务 |
| `components/scenario-form.tsx` | 同上 |
| `components/generate-page-client.tsx` | mount 时检查未完成 generate 任务 |

**明确不做的事（YAGNI）：**
- 不做多模型切换（延后）
- 不做 WebSocket / SSE
- 不做任务优先级
- 不做任务取消
- 不做 `/tasks` 页面
- 不改 `lib/image-api.ts`（worker 直接复用）
- 不改 `lib/chat-api.ts`（chatRefine 保持同步）
- 不改 Gallery 页面
