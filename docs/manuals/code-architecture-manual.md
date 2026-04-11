# Leo Image Studio 代码架构说明书

更新日期：2026-04-11

## 1. 架构概览

Leo Image Studio 采用 Next.js App Router 单体应用架构，前后端代码位于同一仓库内。页面路由、Server Actions、认证、数据库访问、对象存储和 UI 组件都在一个应用层内协同运行，适合当前产品所处的 MVP 到小规模生产阶段。

当前线上主链路是：

1. 用户在前端页面提交生成或编辑请求
2. Client Component 调用 Server Action
3. Server Action 完成鉴权、校验、配额检查
4. 服务端调用图像 API
5. 结果上传到 Vercel Blob
6. 元数据写入 Postgres
7. 前端收到结果并展示后处理动作

仓库中仍保留一套异步任务队列与 worker 代码，但 2026-04-10 已回退到同步链路，因此异步部分当前属于“冻结待重启”状态。

## 2. 技术栈

- 框架：Next.js 16 App Router
- 语言：TypeScript
- 视图库：React 19
- 样式：Tailwind CSS 4
- 基础组件：shadcn/ui 风格组件
- 认证：NextAuth v5 Credentials Provider
- 数据库：Vercel Postgres
- ORM：Drizzle ORM
- 文件存储：Vercel Blob
- 通知：Sonner
- 图标：lucide-react
- 图像接口：外部图像 API，默认配置为 `147ai.com`

## 3. 目录结构

```text
app/
  (auth)/                  登录注册页面
  (dashboard)/             登录后的工作台页面
  actions/                 Server Actions
  api/                     路由处理器，含 auth、cron、worker
  layout.tsx               全局布局

components/
  landing/                 首页相关组件
  workbench/               工作台壳层组件
  ui/                      通用基础 UI 组件
  *.tsx                    表单、图库、设置、语言等业务组件

lib/
  db/                      Drizzle schema、db 实例、查询函数
  auth.ts                  NextAuth 配置
  image-api.ts             外部图像 API 封装
  storage.ts               Blob 上传删除
  quota.ts                 配额查询与封装
  i18n.ts                  中英文文案字典
  plans.ts                 升级方案数据
  task-*.ts                异步任务队列相关逻辑
  *.test.ts                Node 原生测试文件

docs/
  superpowers/             设计 spec 与实现 plan
  manuals/                 长期维护型说明文档
```

## 4. 路由分层

### 4.1 公开路由

- `/` 首页
- `/login` 登录
- `/signup` 注册
- `/terms` 服务条款
- `/privacy` 隐私政策

### 4.2 受保护路由

这些页面放在 `app/(dashboard)` 下，由布局统一做会话检查：

- `/generate`
- `/edit`
- `/gallery`
- `/settings`
- `/upgrade`

`app/(dashboard)/layout.tsx` 会：

- 调用 `auth()` 校验当前会话
- 未登录时重定向到 `/login`
- 读取用户 profile 和 quota
- 注入 `LocaleSync`
- 渲染 `DashboardShell`

## 5. UI 分层

### 5.1 全局层

- `app/layout.tsx`
  - 注入 `SessionProvider`
  - 注入 `LocaleProvider`
  - 注入 `Toaster`

### 5.2 工作台壳层

- `components/workbench/dashboard-shell.tsx`
  - 负责桌面端双栏布局与移动端抽屉导航
- `components/workbench/sidebar-nav.tsx`
  - 负责导航、配额卡、账户菜单
- `components/workbench/top-context-bar.tsx`
  - 负责页面顶部上下文信息
- `components/workbench/surface-panel.tsx`
  - 负责统一的内容面板视觉容器

### 5.3 业务页面组件

- `generate-form.tsx` 处理文生图交互
- `edit-form.tsx` 处理传图编辑交互
- `image-grid.tsx`、`image-card.tsx`、`gallery-filters.tsx` 处理图库
- `settings-form.tsx` 处理账户设置
- `plan-card.tsx` 处理升级方案卡片

### 5.4 基础 UI 组件

`components/ui/*` 放置按钮、输入框、对话框、下拉菜单、卡片、选择器等基础构件，业务组件基于这一层组合。

## 6. 状态管理策略

项目没有引入 Redux、Zustand 一类全局状态库，当前以“React 局部状态 + Server Action + 少量 Context”完成状态管理。

### 6.1 Session 状态

- 由 `SessionProvider` 和 NextAuth 管理
- 服务端通过 `auth()` 读取用户身份

### 6.2 Locale 状态

- `LocaleProvider` 提供 `locale`、`setLocale` 与 `dictionary`
- 未登录页面语言偏好保存在 `localStorage`
- 登录后页面会通过 `LocaleSync` 用数据库中的 `locale` 同步客户端状态
- 账户设置中的语言切换会调用 `updateLocaleAction` 并在成功后 `router.refresh()`

### 6.3 表单状态

- `generate-form.tsx` 与 `edit-form.tsx` 使用 `useState`、`useTransition`
- 设置页同样用局部 state 管理昵称、头像、语言、密码输入

## 7. 认证架构

认证核心位于 `lib/auth.ts`。

关键特点：

- 使用 NextAuth Credentials Provider
- 只支持邮箱 + 密码登录
- 使用 JWT session strategy
- 密码在数据库中以哈希形式存储并通过 `bcryptjs.compare` 验证
- 登录页与登出回跳页都指向 `/login`

说明：

- `accounts`、`sessions` 表已按 NextAuth 标准保留
- 当前实现实际主路径仍以 Credentials + JWT 为主

## 8. 数据库设计

Schema 定义位于 `lib/db/schema.ts`。

### 8.1 `users`

存储用户基础资料：

- `email`
- `password`
- `name`
- `image`
- `role`
- `dailyQuota`
- `monthlyQuota`
- `locale`

### 8.2 `images`

存储图像元数据：

- 归属用户
- 类型：`generate` 或 `edit`
- prompt
- 宽高比、清晰度
- Blob URL
- 文件大小
- sourceImages
- 收藏状态

### 8.3 `usageLogs`

存储生成与编辑行为，用于统计日配额和月配额。

### 8.4 `tasks`

为异步任务队列设计的任务表，包含：

- `status`
- `payload`
- `result`
- `attempts`
- `maxAttempts`
- `lastError`
- `nextRetryAt`

当前该表仍存在，但不是线上主链路依赖。

## 9. 数据访问层

数据访问集中在 `lib/db/queries.ts`。

该文件承担三类职责：

- 用户与 profile 查询更新
- 图像与图库查询更新
- 配额、usage log、task 队列读写

这种设计让页面和 action 尽量不直接书写 SQL 细节，而通过明确函数完成读写。

## 10. Server Action 架构

`app/actions/*` 是业务写操作和部分读取逻辑的核心入口。

### 10.1 `generate.ts`

主流程：

1. `auth()` 校验身份
2. 校验 prompt、宽高比、清晰度
3. `checkQuota()` 检查额度
4. `generateImage()` 调外部图像 API
5. `uploadImage()` 上传 Blob
6. `insertImage()` 写入数据库
7. `recordUsage()` 记录配额消耗

### 10.2 `edit.ts`

主流程：

1. `auth()` 校验身份
2. 校验 prompt 与图片数量
3. 限制图片大小
4. 用 `file-type` 做 magic-byte 文件头校验
5. `checkQuota()` 检查额度
6. `editImage()` 调图像 API
7. `uploadImage()` 上传结果
8. `insertImage()` 写数据库
9. `recordUsage()` 记录消耗

### 10.3 `settings.ts`

负责：

- 更新语言偏好
- 更新昵称与头像
- 修改密码

### 10.4 `gallery.ts`

负责：

- 收藏切换
- 删除图片
- 图库读取辅助动作

## 11. 外部服务封装

### 11.1 图像 API

`lib/image-api.ts` 封装了两条能力：

- `generateImage(prompt, aspectRatio, quality)`
- `editImage(prompt, imageBuffers)`

实现方式：

- 向配置的图像接口发送请求
- 读取响应中的 base64 数据
- 转为 `Buffer`

### 11.2 Blob 存储

`lib/storage.ts` 负责：

- 上传图片到 Vercel Blob
- 删除 Blob 中的图片

命名策略采用 `userId/timestamp-random.png` 形式，便于按用户隔离资源。

## 12. 配额体系

配额逻辑位于 `lib/quota.ts` 和 `lib/db/queries.ts`。

实现方法：

- 读取用户的日上限和月上限
- 基于 `usageLogs.createdAt` 统计 UTC 日与 UTC 月内消耗
- 返回 `allowed`、已用次数与上限

配额真正生效点在 Server Actions，而不是前端组件，因此属于服务端强校验。

## 13. 国际化设计

国际化核心在 `lib/i18n.ts`。

特点：

- 文案集中在一个 `copy` 对象中
- 通过 `DeepReadonly + deepFreeze` 冻结字典，降低运行时误改风险
- 通过 `LocaleProvider` 暴露当前语言对应字典
- 页面组件通常通过 `useLocale()` 或 `copy[locale]` 获取文案

当前代码中仍有部分中文字符串出现编码异常或未完全走字典，这是后续需要继续清理的技术债。

## 14. 图像处理链路

### 14.1 生成链路

页面组件 `generate-form.tsx` 调用 `generateImageAction()`，返回结果后直接在当前页面展示。

### 14.2 编辑链路

页面组件 `edit-form.tsx` 支持：

- 本地上传图片
- 客户端压缩
- 从 URL 参数预加载 source image

其后再调用 `editImageAction()` 完成服务端处理。

### 14.3 结果后处理

`PostActions` 组件负责统一的结果操作：

- 下载
- 继续编辑
- 重试
- 复制 prompt
- 回填到生成页

这使生成页、编辑页、图库卡片对结果操作有一致心智。

## 15. 异步任务子系统现状

以下文件代表保留中的异步架构：

- `app/actions/tasks.ts`
- `app/api/worker/process/route.ts`
- `app/api/cron/process-tasks/route.ts`
- `lib/task-worker.ts`
- `lib/task-recovery.ts`
- `lib/trigger-worker.ts`

当前状态：

- 代码仍在仓库中
- 相关注释已明确标注为 frozen
- 当前 UI 主链路不依赖这些代码
- 设计目标是为未来重新启用异步处理、重试、zombie recovery 和 worker 触发打基础

如果未来恢复异步链路，建议重新审视：

- Hobby 环境下的超时限制
- worker 触发可靠性
- 用户端等待体验
- 任务完成通知机制

## 16. 测试与质量保障

当前仓库已有一批 Node 原生测试，集中在 `lib/*.test.ts`，主要覆盖：

- i18n
- gallery
- edit source
- task worker state
- task recovery
- task status copy
- trigger worker

日常验证命令：

```bash
npm run lint
npm run build
node --test lib/i18n.test.ts
```

## 17. 环境变量

示例位于 `.env.local.example`，核心变量包括：

- `POSTGRES_URL`
- `BLOB_READ_WRITE_TOKEN`
- `AUTH_SECRET`
- `AUTH_URL`
- `IMAGE_API_KEY`
- `IMAGE_API_URL`
- `IMAGE_MODEL`

为异步任务保留但当前非主链路的变量：

- `WORKER_SECRET`
- `CRON_SECRET`
- `APP_URL`

## 18. 部署架构

当前部署目标是 Vercel。

基本路径：

1. 推送代码到远端 `master`
2. Vercel 自动构建并发布
3. Next.js 页面、Server Actions、路由处理器一并部署
4. Postgres 与 Blob 作为外部托管服务接入

## 19. 维护建议

- 新增功能时，优先沿用现有分层：页面组件 -> Server Action -> lib 封装 -> db/storage/api
- 涉及用户状态变更时，优先以服务端为准，再通过 `router.refresh()` 同步 UI
- 新文案优先进入 `lib/i18n.ts`，不要在组件中散落硬编码
- 若重启异步队列，先明确“同步链路是否退役”与“用户端反馈机制”再实施
- 若继续推进前端重设计，优先在 workbench 壳层和 create/edit 车道内演进，而不是重新打散目录
