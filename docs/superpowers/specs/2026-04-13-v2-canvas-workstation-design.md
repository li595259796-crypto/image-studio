# Leo Image Studio v2 — 无限画布 × 多模型创作工作台

> 设计文档 | 2026-04-13 | 状态：Review v3（合并 4 方 review 反馈）
>
> **Supersedes**: 本 spec 覆盖 P5 (2026-04-11-p5-sitewide-frontend-redesign-design.md)
> 中关于 authenticated IA 的部分定义。具体地：一级导航从 P5 的
> `Create | Edit | Library` 变更为 `Canvas | Generate | Edit | Gallery | Settings`，
> 登录后默认首页从 `/generate` 变更为 `/canvas`。P5 中关于设计语言、组件系统、
> 公共页面的定义仍然有效。

---

## 一、产品定位

### 一句话定义

一个让创作者用更低成本调用多个 AI 模型，并在无限画布上完成生成、比较、编辑、整理和导出的图像工作台。

### 三层定位

| 层级 | 主张 | 说明 |
|------|------|------|
| **对外获客** | 最省钱的多模型生图工作台 | 用户先因为"省钱、多模型、并发对比"进来 |
| **产品差异化** | AI 创作无限画布 | 进来后被"画布式创作体验"留下 |
| **最终产品定义** | 一站式 AI 图像工作台 | 最后因为"生成、编辑、资产、项目闭环"长期使用 |

首页表达策略：首屏讲获客（省钱），Demo 讲差异化（画布），产品结构讲长期价值（闭环）。

### 核心价值

1. **成本价值**：不依赖高溢价中间平台，直接调用原厂或低成本模型
2. **效率价值**：同 prompt 多模型并发出图，结果铺在同一画布里比较
3. **工作流价值**：从生成、参考图、编辑、资产沉淀到导出，全在一个上下文里

### 目标用户

| 类型 | 需求 |
|------|------|
| 个人高频创作者 | 快速试风格、试模型、控制成本 |
| 小团队内容生产者 | 沉淀项目、统一素材、提升出图效率 |
| 设计辅助型用户 | AI 图像用于构图探索、提案和局部修改 |

### 竞品差异

| | Lovart / Flora | DIY 本地画布 | **Leo Image Studio v2** |
|---|---|---|---|
| 模型数量 | 1-2 个 | 多个（自己接） | 多个（平台管理） |
| 使用门槛 | 注册即用 | 需要懂代码、自己填 key | 注册即用，不需要 key |
| 画布 | 无 | 有（本地） | 有（在线，数据持久化） |
| 账号/存储 | 有 | 无 | 有（云端保存画布） |
| 价格 | 订阅制，贵 | 自付 API 费 | 免费（后期可切付费） |

---

## 二、产品结构

### 核心模块（4 个，V1 不做独立 Projects 模块）

| 模块 | 用途 | 说明 |
|------|------|------|
| **Canvas** | 核心升级点 | 生成结果、参考图、标注、编辑全在项目画布里 |
| **Generate** | 单次创作入口 | 快速出第一批图，不需要画布的用户用 |
| **Edit** | 单图深度处理 | 重绘、扩图、擦除、高清放大 |
| **Library** | 历史资产管理 | 所有图片、收藏、可"在画布中打开" |

Canvas 不替代 Generate/Edit，而是把它们组织成"项目级创作"。V1 阶段 Canvas = Project（一个画布就是一个项目）。

### 用户主流程

```text
用户进入 Canvas（或 Generate）
→ 输入 prompt，选择一个或多个模型
→ 并发出图，结果自动进入当前画布
→ 在画布上拖拽排布、比较、打标、收藏
→ 选中某张图继续 Edit
→ 可以把画布中的图设为参考图，再生成下一轮
→ 保存画布（或导出单图）
```

### 首次登录体验

新用户登录后进入 `/canvas`。如果没有任何画布：
- **自动创建一个"未命名画布"并直接进入详情页**（跳过空列表）
- 生成面板自动展开，引导用户输入第一个 prompt
- 第一次成功生成后，画布自动保存

回访用户：进入画布列表页，按 `lastOpenedAt` 排序显示。

---

## 三、功能分期

### V1：多模型画布 MVP

| 功能 | 说明 |
|------|------|
| **无限画布** | Figma 风格，网格背景、缩放（滚轮）、拖拽平移 |
| **多模型同时出图** | 一个 prompt → 勾选要用的模型 → 同时调用 → 结果逐个流式回填画布 |
| **模型标签** | 每张图左上角显示模型名 + 生成耗时 |
| **生成面板** | 右侧面板：prompt 输入框、模型多选、比例选择、生成按钮 |
| **图片操作** | 选中、拖动、缩放、右键删除/下载 |
| **并行生成** | 单 API Route + SSE 流式推送，先完成的先显示 |
| **拖入本地图片** | 从电脑拖 .png/.jpg 到画布上（立即上传 Blob，成为正式资产） |
| **画布 CRUD** | 新建/重命名/保存/加载画布 + 防丢失 debounced autosave |
| **BYOK Beta** | 设置页填自己的 API key，公平使用限制 200 次/天 |
| **比例选择** | 1:1、16:9、9:16、4:3、3:4 |

V1 接入 3 个候选模型族（具体 model ID 和定价见附录 B，可能随供应商变动）：

- **Google Gemini Flash 系列** — 速度快，有免费额度
- **字节跳动即梦 Seedream 系列** — 国内模型，便宜
- **阿里云通义万相系列** — 有新用户免费额度

> 147ai.com 保留为 fallback adapter，但不再作为默认。

### V2：画布编辑 + 效率 + 视频

| 功能 | 说明 |
|------|------|
| **Inpainting** | 框选图片中的区域 → 输入新 prompt → AI 只重绘选区 |
| **Outpainting** | 拖动图片边缘 → AI 补全新区域 |
| **擦除填充** | 涂抹要去掉的对象 → AI 自动填充背景 |
| **@引用参考图** | prompt 里输入 @ 弹出画布上的图片列表，选中作为参考图 |
| **批量生成** | 一次 1/2/4 张，并排显示 |
| **Prompt 预设库** | 保存/加载常用 prompt |
| **Undo/Redo** | 画布操作历史 |
| **视频生成（独立异步子系统）** | 见下方"V2 视频架构说明"，不复用图片 ModelAdapter 契约 |

#### V2 视频架构说明

视频生成与图片生成有本质区别：大多数视频 API 是异步 job 模式（提交任务 → 轮询状态 → 下载结果），
耗时通常 30s-5min，不适合同步请求。因此视频生成作为**独立的异步媒体子系统**设计：

```typescript
// lib/video/types.ts（V2 新增，不复用 ModelAdapter）
export type AsyncJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface VideoJobAdapter {
  id: string                    // 'kling-1.6'
  name: string                  // '可灵 1.6'
  provider: ModelProvider       // 'kuaishou'
  submit(options: {
    prompt: string
    aspectRatio: string
    referenceImageUrl?: string  // Blob URL（服务端 fetch），不是 Buffer
  }): Promise<{ jobId: string; estimatedSeconds: number }>
  poll(jobId: string): Promise<{
    status: AsyncJobStatus
    progress?: number           // 0-100
    resultUrl?: string
    posterUrl?: string          // 封面图
    durationSeconds?: number    // 实际视频时长
    error?: string
  }>
}
```

需要独立的 `videoJobs` 表（V2 设计时详细定义），至少包含：
id, userId, canvasId, provider, modelId, status, prompt,
posterUrl, durationSeconds, mimeType, resultUrl, error, createdAt, completedAt。

画布上视频显示为"可播放卡片"：提交后显示进度条，完成后显示封面图 + 播放按钮。

**V2 视频模型候选（具体 SKU 在实现计划中确认）：**

| 模型族 | 来源 | 特点 |
|--------|------|------|
| 可灵 (Kling) | 快手 | 国产最强之一 |
| Seedance | 字节/火山引擎 | 和即梦同平台，接入成本低 |
| Hailuo (海螺) | MiniMax | 效果好 |
| Vidu | 生数科技 | 国产 |

### V3：商业化 + 增长

| 功能 | 说明 |
|------|------|
| 付费体系 | Free / Pro 层级，按量付费 |
| 更多模型 | Flux、DALL-E、Runway Gen-4、Veo |
| 导出 | 画布导出为 PDF / 拼图 / ZIP |
| 分享 | 画布只读分享链接 |
| 首页改版 | 按三层文案重新设计 landing page |
| 协作 | 多人同时编辑一个画布（预留） |

---

## 四、技术架构

### 架构图

```text
┌─────────────────────────────────────────────┐
│                  前端                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ 无限画布   │  │ 生成面板  │  │ 工具栏     │ │
│  │(Excalidraw)│  │ (React)  │  │ (shadcn)  │ │
│  └──────────┘  └──────────┘  └───────────┘ │
└─────────────────┬───────────────────────────┘
                  │ SSE Stream + Server Actions
┌─────────────────▼───────────────────────────┐
│                后端 (Next.js)                │
│  ┌──────────────────────────────────────┐   │
│  │  /api/generate (SSE Route Handler)   │   │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐ │   │
│  │  │Gemini  │ │Seedream│ │通义万相   │ │   │
│  │  │Adapter │ │Adapter │ │Adapter   │ │   │
│  │  └────────┘ └────────┘ └──────────┘ │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Auth     │  │ Quota    │  │ Storage  │  │
│  │ (现有)    │  │ (扩展)   │  │ (现有)    │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Vercel Postgres  │  Vercel Blob            │
│  (用户/配额/画布)  │  (生成的图片/视频)       │
└─────────────────────────────────────────────┘
```

### 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 画布库 | **Excalidraw**（MIT 许可） | **许可优先的工程选择，非最佳体验库。** Excalidraw 默认气质偏手绘，不是天然最像 Figma 的画布；但它是当前阶段许可（MIT 完全免费）与成本风险最低的选择。React 原生、无限画布、图片嵌入支持、118K+ stars。tldraw 体验更强但需要商业许可（100 天试用到期后无法免费商用）。**如果产品验证成功，后续评估升级到更强画布引擎或定制主题** |
| 模型路由 | **Adapter 模式** | 每个模型一个 adapter 文件，统一接口，加新模型只需加一个文件 |
| 并行调用 | **单 API Route + SSE** | 统一编排、统一配额预扣、统一安全校验、统一 BYOK 解密，同时实现"谁先完成谁先显示"的流式体验。单入口也规避了 Vercel Serverless 并发限制可能造成的排队问题。见"多模型并发策略"一节 |
| 画布状态存储 | **JSONB in Postgres** | Excalidraw 状态是 JSON，存一个字段。V1 限制 100 张图/画布，5MB 上限 |
| BYOK 密钥存储 | **AES-256-GCM + per-user key derivation** | 见"BYOK 安全设计"一节 |
| 部署 | **继续 Vercel** | 现阶段零运维优先，等用户量起来再考虑自建 |

### Model Adapter 接口

```typescript
// lib/models/types.ts
export type ModelProvider = 'google' | 'bytedance' | 'alibaba' | '147ai'

export interface GenerateOptions {
  prompt: string
  aspectRatio: string
  quality?: string
  referenceImageUrls?: string[]  // Blob URLs，服务端 fetch，不是 Buffer
}

export type AdapterResult =
  | { ok: true; data: Uint8Array; mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; durationMs: number }
  | { ok: false; errorCode: 'provider_error' | 'timeout' | 'quota' | 'invalid_response'; message: string }

export interface ModelAdapter {
  id: string                        // 'gemini-2.5-flash'
  name: string                      // 'Gemini 2.5 Flash'
  provider: ModelProvider            // 'google'（联合类型，防拼写错误写入 DB）
  supportsReferenceImages: boolean   // 能力标志
  supportedAspectRatios: string[]
  supportedQualities?: string[]
  generate(options: GenerateOptions): Promise<AdapterResult>
  // 此接口仅用于图片生成。
  // 视频生成是独立的异步子系统，不复用此契约。
}
```

文件结构：
- `lib/models/types.ts` — 接口定义（上述所有类型）
- `lib/models/router.ts` — SSE 流式调度
- `lib/models/gemini-flash.ts` — Google Gemini adapter
- `lib/models/seedream.ts` — 即梦 adapter
- `lib/models/tongyi.ts` — 通义万相 adapter
- `lib/models/147ai.ts` — 现有 147ai adapter（保留为 fallback）

### 多模型并发策略：单 API Route + SSE

#### 为什么选择单 Route + SSE 而不是其他方案？

| 方案 | 问题 |
|------|------|
| 前端并行 N 个 SA | 配额、安全、BYOK 解密分散在 N 个调用里，无法统一编排；且 Vercel Serverless 并发限制可能导致排队 |
| 单 SA + Promise.allSettled | SA 不支持流式返回，前端必须等最慢的模型跑完才看到任何结果 |
| **单 API Route + SSE** | 一次请求统一处理认证/配额/BYOK/白名单校验，内部并行调模型，通过 SSE 逐个推送完成结果 |

#### 具体做法：单 API Route Handler + SSE（Server-Sent Events）

```text
前端点击"生成"
  → POST /api/generate { modelIds, prompt, aspectRatio, canvasId, groupId }
  → 服务端原子预扣 N 次配额（失败则返回 402）
  → 服务端为每个模型写一条 generationJobs 记录（status='processing'）
  → 服务端内部 Promise.allSettled 并行调 N 个 adapter
  → 每个 adapter 完成时：
    ① 上传结果到 Vercel Blob
    ② 写入 images 表 + 更新 generationJobs 状态
    ③ 通过 SSE 推送一条 event 给前端：{ modelId, imageId, blobUrl, durationMs }
  → 前端收到 event 就立即回填对应的占位卡
  → 所有模型完成（或超时）后，SSE 流关闭
```

```typescript
// app/api/generate/route.ts
export async function POST(req: Request): Promise<Response> {
  // 1. 认证
  // 2. 验证输入（modelIds 必须在 ALLOWED_MODEL_IDS 白名单内）
  // 3. 查询 BYOK keys（从 DB 解密，不从客户端传入）
  // 4. 原子预扣配额（单次 DB 操作，避免竞态）
  // 5. 写 generationJobs 记录
  // 6. 返回 SSE ReadableStream
  //    内部 Promise.allSettled 并行调 N 个 adapter
  //    每个完成就 push 一条 SSE event
}
```

**只用 1 个并发函数**，但用户体验等同于真正的并行——先完成的先显示。

#### 孤儿结果防护：generationJobs 表

用户刷新页面、关标签页、网络断开时，SSE 连接中断，但服务端的 adapter 调用可能已经成功。
如果没有持久化记录，结果会变成"图生成了，进了 Blob，但没挂回 Canvas"的孤儿。

**解决方案：最小持久化 generationJobs 表。**

#### generationJobs 状态机

```text
           ┌──────────┐
  创建 ──→ │processing│
           └────┬─────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
  ┌─────────┐      ┌──────┐
  │completed│      │failed│
  └─────────┘      └──────┘
```

| 状态 | 含义 | 触发条件 |
|------|------|----------|
| `processing` | adapter 正在调用中 | SSE Route 创建 job 时的初始状态 |
| `completed` | 成功生成，imageId 已关联 | adapter 返回 ok + 图片已上传 Blob + 已写入 images 表 |
| `failed` | 生成失败 | adapter 返回 error 或超时 |

> **V1 明确不支持取消（canceled）。** 原因：SSE 流内的 Promise.allSettled 无法中途 abort 单个 adapter 调用。
> 如果用户关闭页面，SSE 连接中断但服务端 adapter 调用会跑完并写入结果。
> V2 如有需要，可通过 AbortController 扩展取消能力。

#### generationJobs 字段定义

```sql
CREATE TABLE "generationJobs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "groupId" UUID NOT NULL,                    -- 同批多模型结果的关联 ID
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "canvasId" UUID REFERENCES canvases(id) ON DELETE SET NULL,
  "modelId" TEXT NOT NULL,                    -- 'gemini-2.5-flash'
  provider TEXT NOT NULL,                     -- 'google'
  "quotaSource" TEXT NOT NULL DEFAULT 'platform'  -- 'platform' | 'byok'
    CHECK ("quotaSource" IN ('platform', 'byok')),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  prompt TEXT NOT NULL,
  "aspectRatio" TEXT,
  "imageId" UUID REFERENCES images(id) ON DELETE SET NULL,  -- completed 时关联
  "errorCode" TEXT,                           -- 'provider_error' | 'timeout' | 'quota' | 'invalid_response'
  error TEXT,                                 -- 人类可读错误信息
  "durationMs" INTEGER,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "completedAt" TIMESTAMPTZ
);
```

#### 孤儿恢复逻辑

前端重新连接画布时，查询未同步的已完成结果：

```sql
SELECT gj.id, gj."modelId", gj."durationMs", i."blobUrl", i.id AS "imageId"
FROM "generationJobs" gj
JOIN images i ON i.id = gj."imageId"
WHERE gj."canvasId" = $1
  AND gj.status = 'completed'
  AND gj."imageId" IS NOT NULL
  AND gj."createdAt" > $2  -- 只查最近 24h，避免全表扫描
ORDER BY gj."createdAt" ASC;
```

前端对比画布 state 中已有的 imageId，补回缺失的结果。

---

## 五、画布与资产的数据所有权

### 单一事实来源规则

| 数据 | 存在哪里 | 说明 |
|------|----------|------|
| 图片文件 | Vercel Blob | `images.blobUrl` 指向 |
| 图片元数据 | `images` 表 | prompt、model、canvasId、sizeBytes 等。**这是资产的单一事实来源** |
| 图片在画布上的位置/尺寸/旋转 | `canvases.state` JSONB | Excalidraw shape 数据。仅画布渲染用 |
| 图片分组（哪些图属于同一次生成） | `generationJobs.groupId` | 通过 groupId 关联 |

### 关键行为定义

| 操作 | 行为 |
|------|------|
| **从本地拖入图片到画布** | 立即上传 Blob → 写入 `images` 表（canvasId = 当前画布）→ 添加到画布 state |
| **在画布上删除图片** | 仅从画布 state 移除 shape。`images` 记录和 Blob 文件保留（图片仍在 Library 可见） |
| **从 Library 全局删除图片** | 删除 `images` 记录 + 删除 Blob 文件 + 从所有包含它的画布 state 中移除 shape |
| **删除画布** | 删除 `canvases` 记录。`images.canvasId` 设为 NULL（`ON DELETE SET NULL`），图片保留在 Library |
| **"在画布中打开"（从 Library）** | 将 `images.canvasId` 更新为目标画布 + 在画布 state 中添加 shape |

---

## 六、BYOK 安全设计

### 加密方案

- **算法**：AES-256-GCM（认证加密，防篡改）
- **每条记录随机 IV**：存储格式 `v1:{iv_hex}:{ciphertext_hex}`
- **Per-user key derivation**：`derivedKey = HKDF(ENCRYPTION_KEY, userId, 'byok-v1')`
  即使 `ENCRYPTION_KEY` 泄露，攻击者还需要每个 userId 才能解密
- **数据库检查约束**：`CHECK ("encryptedKey" LIKE 'v1:%')`，防止明文意外写入

### 密钥轮换

- `userApiKeys` 表增加 `keyVersion INTEGER NOT NULL DEFAULT 1`
- 轮换时：更新 env var → migration 用新 key 重新加密所有行 → bump keyVersion
- 解密时按 keyVersion 选择对应的 derivation 参数

### 传输规则

- 用户在设置页输入 key → HTTPS POST → 服务端加密 → 存 DB → 返回脱敏预览 `AIza••••4IOs`
- **永远不从客户端传递 key 到生成请求**。生成时服务端从 DB 查询解密
- 前端不缓存、不 localStorage、不放 state manager

### 应急响应

如果怀疑 `ENCRYPTION_KEY` 泄露：
1. 立即更换 Vercel env var
2. 运行迁移脚本重新加密所有行
3. 通知用户轮换第三方 API key

---

## 七、数据库变更

### 新增表

```sql
-- 画布
CREATE TABLE canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '未命名画布',
  state JSONB NOT NULL DEFAULT '{}',
  "thumbnailUrl" TEXT,
  "lastOpenedAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  CHECK (char_length(name) <= 200)
);

-- 用户 API Keys（BYOK）
CREATE TABLE "userApiKeys" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'bytedance', 'alibaba')),
  "encryptedKey" TEXT NOT NULL CHECK ("encryptedKey" LIKE 'v1:%'),
  "keyVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE("userId", provider)
);

-- 生成任务记录（最小持久化，防孤儿结果。完整状态机见第四章）
CREATE TABLE "generationJobs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "groupId" UUID NOT NULL,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "canvasId" UUID REFERENCES canvases(id) ON DELETE SET NULL,
  "modelId" TEXT NOT NULL,
  provider TEXT NOT NULL,
  "quotaSource" TEXT NOT NULL DEFAULT 'platform'
    CHECK ("quotaSource" IN ('platform', 'byok')),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  prompt TEXT NOT NULL,
  "aspectRatio" TEXT,
  "imageId" UUID REFERENCES images(id) ON DELETE SET NULL,
  "errorCode" TEXT,
  error TEXT,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "completedAt" TIMESTAMPTZ
);
```

### 现有表变更

```sql
-- images 表增加字段（注意：V1 不加 mediaType，延迟到 V2）
ALTER TABLE images ADD COLUMN model TEXT;
ALTER TABLE images ADD COLUMN "canvasId" UUID REFERENCES canvases(id) ON DELETE SET NULL;
ALTER TABLE images ADD COLUMN "durationMs" INTEGER;

-- usageLogs 表扩展
ALTER TABLE "usageLogs" ADD COLUMN model TEXT;
ALTER TABLE "usageLogs" ADD COLUMN provider TEXT;
ALTER TABLE "usageLogs" ADD COLUMN "quotaSource" TEXT CHECK ("quotaSource" IN ('platform', 'byok'));
ALTER TABLE "usageLogs" ADD COLUMN "groupId" UUID;
ALTER TABLE "usageLogs" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "usageLogs" ADD COLUMN "canvasId" UUID REFERENCES canvases(id) ON DELETE SET NULL;

-- 现有 TIMESTAMP 列迁移到 TIMESTAMPTZ（安全，无需重写）
-- ALTER COLUMN ... TYPE TIMESTAMPTZ USING col AT TIME ZONE 'UTC'
-- （对所有现有表的所有 timestamp 列执行，migration 中批量处理）
```

### 索引策略

```sql
-- 新表
CREATE INDEX CONCURRENTLY idx_canvases_user_lastopened
  ON canvases ("userId", "lastOpenedAt" DESC);

CREATE INDEX CONCURRENTLY idx_genjobs_canvas_status
  ON "generationJobs" ("canvasId", status);

CREATE INDEX CONCURRENTLY idx_genjobs_groupid
  ON "generationJobs" ("groupId");

-- 现有表补缺
CREATE INDEX CONCURRENTLY idx_images_user_createdat
  ON images ("userId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY idx_images_canvasid
  ON images ("canvasId") WHERE "canvasId" IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_usagelogs_user_createdat
  ON "usageLogs" ("userId", "createdAt");

CREATE INDEX CONCURRENTLY idx_usagelogs_groupid
  ON "usageLogs" ("groupId") WHERE "groupId" IS NOT NULL;

-- BYOK 配额快速查询
CREATE INDEX CONCURRENTLY idx_usagelogs_user_createdat_platform
  ON "usageLogs" ("userId", "createdAt")
  WHERE "quotaSource" = 'platform';
```

### 配额系统扩展

- 多模型并发：选 3 个模型 = 扣 3 次配额（每条 usageLog 对应一次扣减）
- BYOK 用户：`quotaSource = 'byok'` 的调用不扣平台配额
- **`getQuotaInfo` 必须只统计 `quotaSource = 'platform'` 的记录**（不能沿用旧查询把 BYOK 也算进去）
- V1 免费阶段：平台 key 用户 20 次/天（合计，不分模型）
- **迁移策略**：现有用户 `dailyQuota` 从 10 升级到 20（ALTER + UPDATE），新用户默认 20
- `groupId` 用于：同批结果分组展示、按模型分析成本、收费前数据验证
- 配额预扣在 SSE Route Handler 里**原子执行**（单次 DB 操作），避免竞态

### 画布状态约束

- 服务端写入前校验 `JSON.stringify(state).length <= 5_242_880`（5MB），超出拒绝保存
- 画布列表页查询**永远不 SELECT state**，只取 id/name/thumbnailUrl/lastOpenedAt/updatedAt
- V1 限制每个画布最多 100 张图片（在添加到画布时校验）
- 实现 debounced autosave（最后一次修改 5s 后自动保存），带 dirty-state 指示器

---

## 八、安全要求

### 认证与授权

- `/canvas` 和 `/canvas/[id]` 必须加入 `middleware.ts` 的 `protectedRoutes`
- 所有画布查询强制 `WHERE "userId" = session.user.id`
- 所有 `userApiKeys` 查询强制 `WHERE "userId" = session.user.id`（永远不只按 key ID 查）

### SSRF 防护

- `modelId` 在 Route Handler 入口处做白名单校验：`ALLOWED_MODEL_IDS.has(modelId)`
- Adapter 内部硬编码目标 API endpoint URL，不从请求参数插值

### 速率限制

- 生成端点：60 次/分钟/用户（BYOK 也限）
- 画布保存端点：10 次/分钟/用户
- BYOK Beta 公平使用：200 次/天/用户（server-side 计数）

### Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  img-src 'self' https://*.public.blob.vercel-storage.com data: blob:;
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
```

### 火山引擎 AK/SK 特殊处理

Volcengine SDK 用 AK/SK 签名请求。SK 不能出现在错误日志里。
Seedream adapter 的 catch 块必须脱敏后再写 errorLogs。

---

## 九、信息架构

```text
Leo Image Studio
├── 首页 (/)                         ← 获客
├── 登录/注册 (/login, /signup)
│
├── 工作台（登录后）
│   ├── 画布列表 (/canvas)            ← 核心入口（新用户自动创建首个画布）
│   │   └── 画布详情 (/canvas/[id])   ← 无限画布 + 生成面板
│   ├── 快速生成 (/generate)          ← 轻量入口（保留）
│   ├── 图片编辑 (/edit)              ← 单图编辑（保留）
│   ├── 图库 (/gallery)               ← 历史图片 + "在画布中打开"
│   └── 设置 (/settings)              ← 账号 + API Keys（BYOK）+ 配额
│
├── 升级 (/upgrade)                   ← 展示方案，不收款
├── 条款/隐私
```

导航栏：`Canvas | Generate | Edit | Gallery | Settings`（Canvas 变为第一个入口）

---

## 十、页面设计

### 画布列表页 `/canvas`

```text
┌──────────────────────────────────────────────┐
│  我的画布                     [+ 新建画布]    │
├──────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 缩略图    │  │ 缩略图    │  │ 缩略图    │   │
│  │ 产品海报  │  │ Logo 探索 │  │ 未命名    │   │
│  │ 3张 · 2h前│  │ 8张 · 昨天│  │ 1张 · 3天前│  │
│  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────────────────────────┘
```

> 图片数量通过 `COUNT(*) FROM images WHERE canvasId = ?` 查询时计算，不做 denormalized 列。

### 画布工作台 `/canvas/[id]`

```text
┌───────────────────────────────────────────────────────┐
│ ← 返回 │ 画布名称(可编辑) │ ⟲ ⟳ │ 100% +/- │ ● 已保存│
├─────────────────────────────────────┬─────────────────┤
│                                     │ 生成面板        │
│                                     │                 │
│                                     │ ┌─────────────┐ │
│                                     │ │ 描述你想要的  │ │
│                                     │ │ 图片...      │ │
│          无 限 画 布                 │ └─────────────┘ │
│                                     │                 │
│   ┌─────────┐  ┌─────────┐         │ 选择模型        │
│   │ Gemini  │  │  即梦    │         │ ☑ Gemini Flash │
│   │ 3.2s    │  │ 生成中.. │         │ ☑ 即梦 5.0     │
│   └─────────┘  └─────────┘         │ ☐ 通义万相      │
│                                     │                 │
│                                     │ 比例            │
│                                     │ [1:1] 16:9 9:16│
│                                     │                 │
│                                     │ 参考图 (0)      │
│                                     │ [拖图到此]      │
│                                     │                 │
│                                     │ ┌─────────────┐ │
│                                     │ │   生 成      │ │
│                                     │ └─────────────┘ │
│                                     │                 │
│                                     │ 生成中: 2 个    │
└─────────────────────────────────────┴─────────────────┘
```

### 设置页 — API Keys Tab

```text
┌──────────────────────────────────────────┐
│ 设置                                      │
│ [账号] [API Keys] [配额]                  │
│                                          │
│ 自带 API Key（可选）· Beta                │
│ 填入你自己的 Key，公平使用限制 200 次/天   │
│                                          │
│ Google AI Studio (Gemini)                │
│ [AIza••••••••4IOs]            [测试] [×]  │
│                                          │
│ 火山引擎（即梦 Seedream）                  │
│ [未设置]                       [添加]     │
│                                          │
│ 阿里云百炼（通义万相）                     │
│ [未设置]                       [添加]     │
│                                          │
│ ℹ 不填也能用，使用平台免费额度              │
└──────────────────────────────────────────┘
```

---

## 十一、首页文案主轴

**首屏（获客 — 省钱）：**
> 一个 Prompt，多个模型，同时出图
>
> 不用订阅 Lovart、Flora。直接调用 Gemini、即梦、通义万相，
> 一张图几分钱，或者自带 Key 完全免费。

**第二屏（差异化 — 画布）：**
> 不只是生图，是一张无限大的创作桌
>
> 所有模型的结果铺在同一张画布上，拖拽对比、标注收藏。
> 选中一张图继续编辑、局部重绘、向外扩展。

**第三屏（长期价值 — 闭环）：**
> 从第一张图到最终交付，全在这里完成
>
> 生成 → 对比 → 编辑 → 整理 → 导出。
> 每个项目一个画布，所有素材永久保存。

**第四屏（信任 — 价格对比）：**

| | Lovart | Leo Image Studio |
|---|---|---|
| 订阅费 | ¥99/月起 | 免费 |
| 自带 Key | 不支持 | 支持 |
| 多模型对比 | 不支持 | 支持 |
| 单张成本 | ¥1-3 | ¥0.03-0.3 |

---

## 十二、商业化设计（设计好但不收费）

### 当前策略

- 全站免费
- BYOK Beta 可用（用户自带 key，公平使用限制 200 次/天）
- 升级页面展示方案但不收款，显示"即将推出"或"加入等候名单"
- 所有用户行为和配额数据做好埋点，为未来收费提供依据

### 未来收费方向（预留）

| 层级 | 价格 | 额度 |
|------|------|------|
| Free | ¥0 | 20 次/天（平台 key） |
| Pro | ¥29/月 | 200 次/天 + 高清模型 + 画布云存储 + 视频生成 |
| BYOK Beta | ¥0 | 自带 key，公平使用限制 200 次/天 |
| 按量超出 | ¥0.1-0.5/张 | 超出套餐后的加购 |

### BYOK 成本说明

即使用户自带模型 key，平台仍然承担：认证、数据库、Blob 存储、带宽、画布状态、错误日志。
因此 BYOK 标记为 **Beta**，保留公平使用边界（200 次/天），不承诺"无限免费"。
后续根据实际成本数据决定是否调整。

---

## 十三、与现有系统的关系

| 现有模块 | V2 变化 |
|----------|---------|
| 认证 (NextAuth JWT) | 不动，画布页面复用。`/canvas` 加入 protectedRoutes |
| 配额系统 | 扩展：多模型计数 + BYOK 免扣 + **getQuotaInfo 只统计 platform** |
| 图片存储 (Vercel Blob) | 不动，画布生成的图也存 Blob |
| Gallery | 加"在画布中打开"入口 |
| Generate / Edit 页面 | 保留，作为轻量级入口 |
| image-api.ts | 重构为 adapter 模式，147ai 变成其中一个 adapter |
| errorLogs | 不动，画布错误同样写入。火山引擎 adapter 需脱敏 SK |
| tasks 表 | 继续冻结，不复用。多模型并行用 SSE Route + generationJobs |
| 部署 (Vercel) | 不动 |
| TEMP timing logs | generate.ts / edit.ts 里的 `tlog` 在 V2 落地前清除 |

---

## 十四、开发计划

### V1 任务拆解（分 3 个子阶段）

#### P6A：Canvas Foundation（画布基础）

| # | 任务 | 预估 |
|---|------|------|
| 1 | Excalidraw 集成 + 空画布页面 + 基础交互（缩放/拖拽/网格） | 1 天 |
| 2 | 画布 CRUD（新建/重命名/保存/加载/列表页）+ autosave + 新用户首次体验 | 1.5 天 |
| 3 | 本地拖入图片（上传 Blob → images 记录 → 画布 shape）+ 右键菜单 | 1 天 |
| 4 | DB migration（canvases + userApiKeys + generationJobs + images/usageLogs 字段 + TIMESTAMPTZ + 索引） | 1 天 |
| 5 | `/canvas` 加入 protectedRoutes + 所有查询所有权校验 + CSP header | 0.5 天 |

P6A 小计：~5 天

#### P6B：Multi-Model Compare（多模型对比）

| # | 任务 | 预估 |
|---|------|------|
| 6 | Model Adapter 架构 + 类型定义 + AdapterResult + Gemini Flash adapter | 1 天 |
| 7 | SSE Route Handler `/api/generate` + generationJobs 写入 + 孤儿恢复逻辑 | 1.5 天 |
| 8 | 生成面板 UI + 占位卡 + SSE 监听 + 模型标签 + 比例选择 | 1 天 |
| 9 | 即梦 Seedream adapter | 0.5 天 |
| 10 | 通义万相 adapter | 0.5 天 |
| 11 | SSRF 白名单校验 + 速率限制 | 0.5 天 |

P6B 小计：~5 天

#### P6C：BYOK + 收尾

| # | 任务 | 预估 |
|---|------|------|
| 12 | BYOK 设置页 UI（API Keys tab）+ 脱敏展示 | 0.5 天 |
| 13 | AES-256-GCM 加解密 + HKDF per-user derivation + keyVersion | 1 天 |
| 14 | 配额系统扩展（quotaSource 过滤 + 原子预扣 + 迁移 dailyQuota 10→20） | 0.5 天 |
| 15 | 集成测试 + 端到端验证 + 清理 TEMP timing logs | 1 天 |

P6C 小计：~3 天

**V1 合计：~13 天**

### V2 路线图

| 任务 | 预估 |
|------|------|
| Inpainting + Outpainting + 擦除 | 3 天 |
| @引用参考图 | 1 天 |
| 批量生成 + Prompt 预设 | 1 天 |
| Undo/Redo | 0.5 天 |
| 视频异步子系统设计 + videoJobs 表 + 第一个 adapter | 3 天 |
| 画布视频播放卡片（进度条 + 封面图 + 播放） | 1 天 |

V2 合计：~9.5 天

---

## 十五、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Excalidraw 手绘风格可能不够"专业感" | 用户感知 | Excalidraw 支持自定义主题和样式覆盖；先验证核心功能，UI 打磨后续迭代 |
| 模型 API 不稳定 | 用户体验差 | 多模型互为 fallback；errorLogs 监控；前端显示具体哪个模型失败 |
| Vercel Hobby 免费额度不够 | 需要付费或迁移 | 现阶段够用；用户量起来后迁腾讯云（方案已评估） |
| BYOK 密钥泄露 | 用户 key 暴露 | AES-256-GCM + per-user derivation + keyVersion 轮换 + 应急响应流程 |
| 画布状态 JSON 过大 | Postgres 性能 | 5MB 硬上限 + 100 张图/画布 + 列表页不 SELECT state |
| SSE 连接中断丢失结果 | 用户丢图 | generationJobs 持久化 + 重连恢复 |

---

## 附录 A：环境变量新增

```text
# V2 新增（现有变量保留不动）
GOOGLE_AI_KEY=           # Google AI Studio key（平台 key）
VOLCENGINE_AK=           # 火山引擎 Access Key
VOLCENGINE_SK=           # 火山引擎 Secret Key（不可出现在日志）
ALIBABA_API_KEY=         # 阿里云百炼 key
ENCRYPTION_KEY=          # BYOK 加密主密钥（HKDF 输入）
```

## 附录 B：V1 候选模型 SKU（可能随供应商变动）

| 模型族 | 候选 Model ID | 来源 | 参考价格（截至 2026-04） |
|--------|---------------|------|--------------------------|
| Google Gemini Flash | gemini-2.5-flash | Google AI Studio | 免费 500 张/天 |
| 即梦 Seedream | seedream-5.0 | 火山引擎 | ~¥0.05/张 |
| 通义万相 | wanxiang-v2 | 阿里云百炼 | 新用户送 500 张 |
| 147ai (fallback) | gemini-3.1-flash-image-preview | 147ai.com | 现有 key |

> 以上价格和 model ID 可能随供应商更新而变化，实现时以各平台文档为准。

## 附录 C：API 申请指南

| 模型 | 申请地址 | 说明 |
|------|----------|------|
| Google Gemini | https://aistudio.google.com → Get API key | 免费 500 张/天 |
| 即梦 Seedream | https://console.volcengine.com → 火山方舟 | 按量付费，几分钱/张 |
| 通义万相 | https://bailian.console.aliyun.com | 新用户送 500 张 |
