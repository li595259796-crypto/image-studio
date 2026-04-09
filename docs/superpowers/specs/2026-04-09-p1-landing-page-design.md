# P1: Landing Page + 信任层 + 品牌改名

## Context
Image Studio 1.0 是功能型原型：登录即用，但新用户看不到产品价值就被要求注册。PM 反馈首页直接跳登录，转化天然偏低。同时产品名 "Image Studio" 过于通用，改为 "Leo Image Studio" 建立品牌辨识度。

## 目标
- 新用户进入首页能通过样例图直观感受产品能力
- 一屏到底的极简设计（Midjourney 风格）
- 支持中英双语切换
- 补齐服务条款和隐私政策
- 全局品牌名从 "Image Studio" 改为 "Leo Image Studio"

## 设计

### Landing Page（`app/page.tsx`）
一屏设计，不滚动：

```
┌─────────────────────────────────────────┐
│  🎨 Leo Image Studio    中/EN    登录    │  ← 顶部导航栏
├─────────────────────────────────────────┤
│                                         │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│   │ img │ │ img │ │ img │ │ img │     │
│   └─────┘ └─────┘ └─────┘ └─────┘     │  ← 样例图网格
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │     (占位图，后续替换)
│   │ img │ │ img │ │ img │ │ img │     │
│   └─────┘ └─────┘ └─────┘ └─────┘     │
│                                         │
│        [ 开始创作 / Start Creating ]     │  ← CTA 按钮 → /signup
│                                         │
│  服务条款 · 隐私政策 · © 2026 Leo Image Studio │  ← Footer 一行
└─────────────────────────────────────────┘
```

- 已登录用户访问 `/` → 直接重定向 `/generate`
- 未登录用户 → 看到 Landing Page
- 样例图：先用 placeholder（unsplash/picsum 占位），后续替换真实生成图
- 响应式：移动端 2x4 网格，桌面端 4x2 网格

### 品牌改名
全局替换 "Image Studio" → "Leo Image Studio"：
- `app/layout.tsx` — metadata title/description
- `components/nav-bar.tsx` — Logo 文字
- `app/(auth)/login/page.tsx` — Card 标题
- `app/(auth)/signup/page.tsx` — Card 标题

### 中英双语
- 极简方案：用 React state + 一个 locale context
- 不引入 i18n 库（YAGNI）
- 语言文本存在 `lib/i18n.ts` 的简单对象里
- 切换按钮在 Landing Page 顶部和 Dashboard nav-bar

### 服务条款 & 隐私政策
- `app/terms/page.tsx` — 基础服务条款
- `app/privacy/page.tsx` — 基础隐私政策
- 内容简短、标准化，覆盖：用户生成内容归属、数据收集、第三方 API 使用
- 中英双语

## 需要修改的文件

| 文件 | 改动 |
|------|------|
| `app/page.tsx` | 重写为 Landing Page（未登录）或重定向（已登录） |
| `app/layout.tsx` | 改 metadata 标题为 "Leo Image Studio" |
| `components/nav-bar.tsx` | 改 Logo 文字，加语言切换 |
| `app/(auth)/login/page.tsx` | 改标题 |
| `app/(auth)/signup/page.tsx` | 改标题 |
| **新增** `components/landing/` | Landing Page 组件 |
| **新增** `lib/i18n.ts` | 简单双语文本对象 |
| **新增** `app/terms/page.tsx` | 服务条款 |
| **新增** `app/privacy/page.tsx` | 隐私政策 |

## 不做的事（YAGNI）
- 不做动画/视差滚动
- 不做 SEO 优化（后续再补）
- 不做多语言 URL（/en, /zh）
- 不引入 i18n 框架
- 不做注册引导流程（P2 做）

## 验证
1. 未登录访问 `image-studio.site` → 看到 Landing Page
2. 已登录访问 → 跳转 `/generate`
3. 点击"开始创作" → 跳转 `/signup`
4. 中英切换正常
5. 条款/隐私页面可访问
6. 所有页面标题显示 "Leo Image Studio"
7. 移动端响应式正常
