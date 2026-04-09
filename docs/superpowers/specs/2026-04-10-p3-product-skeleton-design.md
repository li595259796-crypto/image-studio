# P3: 产品骨架 — 统一错误体验 + 语言持久化 + 账户设置 + 升级页 + Gallery 增强

## Context

P2 落地后，Leo Image Studio 有了 6 个场景化出图、生成后操作闭环、Gallery 基础复用。但产品仍缺乏"骨架"：错误体验各页面各管各的、语言偏好刷新就丢、用户无法管理账户、配额用尽无出路、Gallery 找图困难。

P3 的定位是"产品骨架"——不做新的 AI 功能，而是让现有功能像**同一个产品**。

## 方案选择

**B-lite：先铺"刚刚好"的基础，再建功能。**

不做完整的基础设施大改造，只先铺两个真正横切且立刻影响体验的基础（统一错误工具 + 语言持久化），然后在这个基础上建功能页面。

## 实现分 Phase

| Phase | 内容 | 用户感知 |
|-------|------|---------|
| Phase 1 | 结构化错误返回 + 统一错误工具 + 配额用尽 CTA + NavBar 入口 + 语言持久化 + dashboard 用户信息从 DB 读 | "报错终于像同一个产品了""语言设置终于记住了" |
| Phase 2 | /settings 页 + /upgrade 页 + Gallery 筛选 + 收藏 | "能改密码了""额度用完知道去哪""找图方便了" |
| Phase 3 | 旧页面错误处理迁移 + displayName/avatarUrl 全局展示 + Error Boundary | 渐进式体验改善 |

---

## 设计

### 1. 统一错误工具

#### 结构化错误返回

扩展 `ActionResult` 类型，加入 `errorCode` 和 `quota` 结构化字段：

```typescript
// lib/types.ts
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  errorCode?: 'quota_exceeded' | 'auth_required' | 'validation_error'
  quota?: {
    dailyUsed: number
    dailyLimit: number
    monthlyUsed: number
    monthlyLimit: number
  }
}
```

Server actions（`generate.ts`、`edit.ts`）配额用尽时返回：

```typescript
return {
  success: false,
  error: 'Quota exceeded',
  errorCode: 'quota_exceeded',
  quota: { dailyUsed, dailyLimit, monthlyUsed, monthlyLimit },
}
```

前端根据 `errorCode` 决定展示方式，不再依赖 `error` 字符串判断。语言切换后 toast 由前端按 locale 本地化渲染。

#### 错误展示规则

| 错误类型 | 展示方式 | 说明 |
|---------|---------|------|
| 表单校验（prompt 为空、密码太短） | inline 红字 | 保持现状不动 |
| 配额用尽 | toast only | **不同时显示 inline 红字**，避免双重反馈 |
| 其他系统错误（API 超时、网络断） | Phase 1 维持现状 | Phase 3 再统一迁移到 toast |

#### 统一错误工具 API

```typescript
// lib/error-toast.ts
import { toast } from 'sonner'

// 普通系统错误
export function showError(message: string): void {
  toast.error(message)
}

// 配额用尽（带升级 CTA）
export function showQuotaError(locale: Locale, quota: QuotaPayload): void {
  // 使用固定 toast id 'quota-exceeded' 防重复弹出
  // 渲染内容：
  //   ⚠ 今日额度已用完
  //   日: 10/10  月: 45/200
  //   [查看升级方案 →]  ← 点击跳 /upgrade
}
```

`showQuotaError` 使用 `toast.error(..., { id: 'quota-exceeded' })` 确保连续点击生成时不会弹出多个相同 toast。

#### Phase 1 改造范围

- `app/actions/generate.ts`：quota exceeded 返回 `errorCode` + `quota` payload
- `app/actions/edit.ts`：同上
- `scenario-form.tsx`、`generate-form.tsx`、`edit-form.tsx`：检查 `errorCode === 'quota_exceeded'` → 调 `showQuotaError`，不显示 inline 红字
- `chatRefine`：Phase 1 暂不改，接受暂时不一致

### 2. 语言偏好持久化

#### 现状

`locale-provider.tsx` 用 React state 存 locale，挂在根 `app/layout.tsx`。当前用 localStorage 持久化，刷新不丢但换设备会丢。`LanguageToggle` 组件同时用在 NavBar（已登录）、landing 页和法务页（未登录）。

#### 单一真相源

| 用户状态 | locale 真相源 | 持久化 |
|---------|-------------|--------|
| 已登录 | DB `users.locale` | server action 写 DB |
| 未登录 | localStorage | client-only，不写 DB |

#### 数据流设计

```
根 layout (app/layout.tsx)
  └─ LocaleProvider (保持现状，localStorage fallback)
       ├─ 未登录页面：localStorage → navigator.language → defaultLocale
       └─ Dashboard layout (app/(dashboard)/layout.tsx)
            └─ <LocaleSync locale={dbLocale} />  ← 新增的 client component
                 └─ mount 时：if dbLocale !== currentLocale → setLocale(dbLocale)
```

**关键决策：根 `app/layout.tsx` 不调 `auth()`。** 根 layout 保持纯净，不引入 auth 依赖。DB locale 的同步由 dashboard layout 内部的 `<LocaleSync>` 组件完成。

#### LocaleSync 组件

```typescript
// components/locale-sync.tsx
'use client'
export function LocaleSync({ locale }: { locale: Locale }) {
  const { locale: current, setLocale } = useLocale()
  useEffect(() => {
    if (locale !== current) setLocale(locale)
  }, [locale]) // 只在 DB locale 变化时同步
  return null
}
```

Dashboard layout 渲染：`<LocaleSync locale={profile.locale} />`

这样已登录用户进入 dashboard 时，DB locale 会覆盖 localStorage 值，实现"DB 是已登录用户的真相源"。

#### LanguageToggle 双模行为

`LanguageToggle` 接收可选 `onPersist` 回调。dashboard 里传 server action，未登录页面不传：

```typescript
// LanguageToggle 改造
interface LanguageToggleProps {
  className?: string
  onPersist?: (locale: Locale) => Promise<void>  // 已登录时传入
}

function handleSwitch(newLocale: Locale) {
  const prev = locale
  setLocale(newLocale)                    // 1. 乐观更新 state + localStorage
  if (onPersist) {
    onPersist(newLocale).catch(() => {
      setLocale(prev)                     // 2. 失败回滚
      toast.error('语言切换失败')
    })
  }
}
```

- **NavBar 里（已登录）：** `<LanguageToggle onPersist={updateLocaleAction} />`
- **Landing / 法务页（未登录）：** `<LanguageToggle />` — 无 onPersist，纯 localStorage

#### Server Action

`updateLocaleAction(locale: 'zh' | 'en')` → 校验 auth → 更新 `users.locale`

#### DB

`users` 表加 `locale text default 'zh'` 列

#### 不做的事

- 不改根 `app/layout.tsx` 的 auth 逻辑
- 不加 cookie 层
- 不做 URL 路由级 i18n
- 不做 SSR 级 locale detection

### 3. Dashboard 用户信息从 DB 读

#### 现状

`app/(dashboard)/layout.tsx` 从 session 读 user email，传给 NavBar。session 里的 `name` 可能不是最新的。

#### 改造

Dashboard layout 从 DB 查完整用户 profile：

```typescript
// lib/db/queries.ts 新增
export async function getUserProfile(userId: string) {
  // 返回 { name, email, image, locale }
}
```

Dashboard layout 调用 `getUserProfile`，将 profile 传给 NavBar 和 `<LocaleSync>`。

#### 设置页保存后的刷新策略

Settings 页面保存成功后，调用 `router.refresh()` 触发 dashboard layout server component 重新执行，从 DB 读取最新 profile，NavBar 自然拿到最新的昵称/头像/locale。

**具体流程：**

1. 用户在 /settings 改昵称 → 点保存
2. `updateProfileAction` 写 DB 成功
3. 客户端收到 success → `toast.success(...)` + `router.refresh()`
4. `router.refresh()` 重新执行 dashboard layout server component
5. `getUserProfile` 从 DB 读到新昵称
6. NavBar 收到新 profile props → 立刻展示新昵称

同理适用于语言切换和头像上传。

这同时解决：
- locale 持久化读取（通过 LocaleSync）
- 昵称修改后即时展示（通过 router.refresh）
- 后续头像接入的基础

### 4. NavBar 入口 + 路由

#### 用户头像下拉菜单扩展

```text
┌─────────────────────┐
│ user@example.com     │
├─────────────────────┤
│ ⚙ 账户设置           │  → /settings
│ ⬆ 升级方案           │  → /upgrade
├─────────────────────┤
│ ↪ 退出登录           │
└─────────────────────┘
```

#### QuotaBadge 可点击

改为 `<button>` 语义（不是伪装的 badge），点击跳 `/upgrade`。确保可访问性和可发现性。

#### 新路由

`/settings` 和 `/upgrade` 放在 `(dashboard)` layout group 里，需要登录。

#### i18n

nav section 加 `settings` 和 `upgrade` 两个 key。

### 5. 账户设置页 `/settings`

#### 布局

单栏表单页，3 个卡片区块：基本信息、语言偏好、安全。

```text
┌─────────────────────────────────────┐
│ ⚙ 账户设置                           │
├─────────────────────────────────────┤
│                                     │
│ 【基本信息】                         │
│ 昵称    [________________] [保存]    │
│ 头像    [当前头像] [上传新头像]       │
│                                     │
│ 【语言偏好】                         │
│ 语言    [中文 ▾]          [保存]     │
│                                     │
│ 【安全】                             │
│ 当前密码  [________________]         │
│ 新密码    [________________]         │
│ 确认密码  [________________]         │
│                     [修改密码]       │
│                                     │
└─────────────────────────────────────┘
```

#### Server Actions

- `updateProfileAction(displayName, avatarFile?)` → 更新 `users.name`，头像上传到 Vercel Blob + 更新 `users.image`
- `updateLocaleAction(locale)` → 更新 `users.locale`（Section 2 共用）
- `changePasswordAction(currentPassword, newPassword)` → bcrypt 校验旧密码 → hash 新密码 → 更新 `users.password`

#### 头像上传

**不复用** `lib/storage.ts` 的 `uploadImage`（那是生成图专用）。新建 `uploadAvatar` 函数或将 storage 抽成通用上传接口。头像路径：`avatars/${userId}.png`。

#### 校验规则

- 昵称：1-50 字符
- 密码：最少 8 位，当前密码必须正确
- 头像：PNG/JPG/WebP，2MB 以内

#### 反馈

每个区块独立保存，成功用 `toast.success` + `router.refresh()`，表单校验失败用 inline。

`router.refresh()` 触发 dashboard layout 重新执行 → NavBar 拿到最新 profile。

#### 改密码后的会话策略

Phase 2 不强制登出，只 toast 成功。后续再做更严格的会话失效策略。

#### Phase 3 延后项

- displayName 显示到 NavBar 头像 initials → Phase 3
- avatarUrl 显示真实头像图片 → Phase 3

### 6. 升级页 `/upgrade`

#### 定位

静态套餐展示页。P3 只做 UI 壳，不接真实支付。

#### 布局

```text
┌─────────────────────────────────────────────────┐
│ ⬆ 升级方案                                       │
│ 解锁更多创作额度                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────┐  ┌─────────────┐  ┌─────────────┐ │
│ │  免费版   │  │  基础版      │  │  专业版      │ │
│ │  ¥0/月   │  │  ¥29/月     │  │  ¥99/月     │ │
│ │          │  │             │  │             │ │
│ │ 10次/日  │  │ 50次/日     │  │ 200次/日    │ │
│ │ 200次/月 │  │ 1000次/月   │  │ 5000次/月   │ │
│ │ 基础场景  │  │ 全部场景     │  │ 全部场景     │ │
│ │          │  │ 4K 质量     │  │ 4K 质量     │ │
│ │          │  │             │  │ 优先队列     │ │
│ │ [当前方案] │  │ [联系我们]   │  │ [联系我们]   │ │
│ └─────────┘  └─────────────┘  └─────────────┘ │
│                                                 │
│  📩 升级咨询：support@image-studio.site          │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### 技术设计

1. **纯前端静态页**，无 server action
2. **套餐数据硬编码**在 `lib/plans.ts` 配置文件中：

```typescript
export interface Plan {
  id: string
  name: { zh: string; en: string }
  price: { zh: string; en: string }
  features: { zh: string[]; en: string[] }
  isCurrent: boolean
  ctaType: 'current' | 'contact'
}
```

3. **"联系我们"按钮** → `mailto:support@image-studio.site`
4. **"当前方案"标记** → 免费版 disabled 按钮
5. **配额用尽联动** → `showQuotaError` 的 "查看升级方案" 跳此页

#### YAGNI 说明

套餐价格和功能点是合理占位值。等商业化 spec 确定后直接改 `lib/plans.ts` 配置，不需要改组件。

#### 不做的事

- 不接 Stripe/支付宝
- 不做用户套餐识别（当前所有人都是免费版）
- 不做套餐切换逻辑

### 7. Gallery 增强

#### 筛选栏

Gallery 页面顶部加筛选栏，两个维度可叠加：

| 筛选 | 实现方式 | UI |
|------|---------|-----|
| 时间范围 | `createdAt >= ?` WHERE 条件 | 下拉：全部 / 今天 / 最近 7 天 / 最近 30 天 |
| 收藏 | `isFavorite = true` WHERE 条件 | Toggle 按钮：全部 / 仅收藏 |

```text
┌─────────────────────────────────────────────────┐
│ 🖼 画廊                    [全部 ▾] [最近7天 ▾]  │
│ 共 42 张                    ❤ 收藏  📅 时间范围   │
├─────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │  ❤  │ │     │ │  ❤  │ │     │               │
│ │ img1│ │ img2│ │ img3│ │ img4│               │
│ └─────┘ └─────┘ └─────┘ └─────┘               │
```

#### 收藏功能

1. **DB：** `images` 表加 `isFavorite boolean default false` 列
2. **Server Action：** `toggleFavoriteAction(imageId)` → 翻转 `isFavorite`
3. **ImageCard 改造：** 右上角心形图标，hover 显示，已收藏常显
4. **ImageViewer 改造：** 弹窗按钮栏加收藏/取消收藏按钮
5. **乐观更新：** 点击后立刻翻转 UI 状态，server action 失败则回滚 + toast

#### Gallery 查询改造

```typescript
// app/actions/gallery.ts
export async function getImages(
  offset?: number,
  limit?: number,
  filters?: {
    favoriteOnly?: boolean
    timeRange?: 'today' | '7d' | '30d'
  }
): Promise<ActionResult<GalleryResult>>
```

筛选条件变化时重置 offset 从 0 加载。

#### 不做的事

- 不做 prompt 关键词搜索
- 不做场景类型筛选
- 不做排序切换（保持时间倒序）
- 不做无限滚动（保持 Load More 按钮）

---

## 需要修改/创建的文件

### Phase 1

| 文件 | 改动 |
|------|------|
| `lib/types.ts` | 扩展 `ActionResult` 加 `errorCode` + `quota` |
| **新增** `lib/error-toast.ts` | `showError` + `showQuotaError`（含配额 toast 带升级 CTA） |
| `app/actions/generate.ts` | quota exceeded 返回结构化错误（`errorCode` + `quota` payload） |
| `app/actions/edit.ts` | 同上 |
| `components/scenario-form.tsx` | 检查 `errorCode === 'quota_exceeded'` → 调 `showQuotaError`，不显示 inline |
| `components/generate-form.tsx` | 同上 |
| `components/edit-form.tsx` | 同上 |
| `lib/db/schema.ts` | users 加 `locale` 列（DB migration） |
| **新增** `app/actions/settings.ts` | `updateLocaleAction`（校验 auth → 更新 `users.locale`） |
| **新增** `components/locale-sync.tsx` | 客户端组件，mount 时将 DB locale 同步到 LocaleProvider |
| `app/(dashboard)/layout.tsx` | 从 DB 查 `getUserProfile` → 传 profile 给 NavBar + 传 locale 给 `<LocaleSync>` |
| `lib/db/queries.ts` | 加 `getUserProfile(userId)` 查询 |
| `components/nav-bar.tsx` | 下拉菜单加设置/升级入口，接收 profile 数据 |
| `components/quota-badge.tsx` | 改为 `<button>` 语义，点击跳 `/upgrade` |
| `components/language-toggle.tsx` | 加 `onPersist` 可选回调：已登录传 server action，未登录不传 |
| `lib/i18n.ts` | 加 nav.settings、nav.upgrade、error toast 相关翻译 |

**注意：根 `app/layout.tsx` 不改。** LocaleProvider 保持现状（localStorage fallback），DB locale 由 dashboard 内的 `<LocaleSync>` 同步。

### Phase 2

| 文件 | 改动 |
|------|------|
| **新增** `app/(dashboard)/settings/page.tsx` | 账户设置页 |
| **新增** `components/settings-form.tsx` | 设置表单（基本信息 + 语言 + 安全） |
| **新增** `app/actions/settings.ts` | `updateProfileAction` + `changePasswordAction`（追加到 Phase 1 创建的文件） |
| **新增** `lib/upload-avatar.ts` | 头像上传函数 |
| **新增** `app/(dashboard)/upgrade/page.tsx` | 升级页 |
| **新增** `components/plan-card.tsx` | 套餐卡片组件 |
| **新增** `lib/plans.ts` | 套餐配置数据 |
| `lib/db/schema.ts` | images 加 `isFavorite` 列 |
| `app/actions/gallery.ts` | `getImages` 加 filters 参数 + `toggleFavoriteAction` |
| `lib/db/queries.ts` | Gallery 查询加 WHERE 条件 |
| `app/(dashboard)/gallery/page.tsx` | 加筛选栏 UI + 状态管理 |
| **新增** `components/gallery-filters.tsx` | 筛选栏组件 |
| `components/image-card.tsx` | 加收藏心形图标 |
| `components/image-viewer.tsx` | 加收藏按钮 |
| `lib/i18n.ts` | 加 settings、upgrade、gallery 筛选相关翻译 |

### Phase 3

| 文件 | 改动 |
|------|------|
| **新增** `components/error-boundary.tsx` | React Error Boundary |
| `app/(dashboard)/layout.tsx` | 包裹 Error Boundary |
| 各组件 | 逐步将系统错误改为 showError toast |
| `components/nav-bar.tsx` | displayName 显示到 initials |
| `components/nav-bar.tsx` | avatarUrl 显示真实头像 |

---

## 不做的事（YAGNI）

- 不接真实支付
- 不做用户套餐识别/切换
- 不做 prompt 搜索
- 不做场景类型筛选
- 不做 URL 路由级 i18n
- 不做 cookie 层 locale 持久化
- 不做改密码后强制登出
- 不做无限滚动替换 Load More

---

## 验证

1. 生成图时故意触发配额用尽 → 出现 toast（不是 inline 红字），带"查看升级方案"链接
2. 连续点击两次生成触发配额用尽 → 只出现一个 toast（不重复）
3. 切换语言 → 刷新页面 → 语言保持 → 换浏览器登录 → 语言也对
4. 未登录访问 landing / login → 语言按浏览器自动检测
5. NavBar 头像下拉 → 有"账户设置"和"升级方案"
6. QuotaBadge 可点击 → 跳到 /upgrade
7. /settings → 改昵称 → 保存 → NavBar 立刻反映（因为从 DB 读）
8. /settings → 改密码 → 成功 toast → 不会被登出
9. /settings → 上传头像 → 保存成功
10. /upgrade → 3 个套餐卡片 → 免费版标记"当前方案" → 其余显示"联系我们"
11. Gallery → 筛选"仅收藏" → 只显示收藏图片
12. Gallery → 筛选"最近 7 天" → 只显示 7 天内图片
13. Gallery → 两个筛选叠加 → 正确组合
14. ImageCard hover → 出现心形 → 点击收藏 → 图标常显
15. ImageViewer → 有收藏按钮 → 点击切换
16. 收藏操作 server action 失败 → UI 回滚 + toast
17. lint + build 通过
