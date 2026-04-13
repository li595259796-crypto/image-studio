# P6B Adapter Reference — API 接入文档 + 代码骨架

> 供 Codex 实现 `lib/models/*.ts` 时直接参考。每个 adapter 的代码骨架可直接复制修改。

---

## 通用类型（已在 spec 定义）

```typescript
// lib/models/types.ts — 直接从 spec v3.1 复制
export type ModelProvider = 'google' | 'bytedance' | 'alibaba' | '147ai'

export interface GenerateOptions {
  prompt: string
  aspectRatio: string
  quality?: string
  apiKey?: string
  referenceImageUrls?: string[]
}

export type AdapterResult =
  | { ok: true; data: Uint8Array; mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; durationMs: number }
  | { ok: false; errorCode: 'provider_error' | 'timeout' | 'quota' | 'invalid_response'; message: string }

export interface ModelAdapter {
  id: string
  name: string
  provider: ModelProvider
  supportsReferenceImages: boolean
  supportedAspectRatios: string[]
  supportedQualities?: string[]
  generate(options: GenerateOptions): Promise<AdapterResult>
}
```

---

## 一、Google Gemini 2.5 Flash Image

### 关键信息

| 项 | 值 |
|---|---|
| Model ID | `gemini-2.5-flash-image` |
| Endpoint | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent` |
| Auth | `x-goog-api-key: API_KEY`（不是 Bearer token） |
| 返回格式 | base64 内嵌在 JSON response 里 |
| 同步/异步 | 同步（直接返回） |
| 参考图 | 支持（`inlineData` in parts） |
| 免费额度 | ~250 RPD（每天） |
| 延迟 | ~5-15s |

### 支持的比例

`1:1`, `3:2`, `2:3`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`

### 请求格式

```json
{
  "contents": [{ "parts": [{ "text": "prompt here" }] }],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": {
      "aspectRatio": "16:9"
    }
  }
}
```

### 响应格式

```json
{
  "candidates": [{
    "content": {
      "parts": [
        { "inlineData": { "mimeType": "image/png", "data": "base64..." } },
        { "text": "optional description" }
      ]
    },
    "finishReason": "STOP"
  }]
}
```

图片在 `candidates[0].content.parts[N].inlineData`，需遍历 parts 找有 `inlineData` 的那个。

### 注意事项

- API 版本是 `/v1beta/` 不是 `/v1/`
- `imageConfig` 里不需要传 `imageSize`
- 一次请求只生成一张图（没有 `n` 参数）
- base64 解码推荐服务端用 `Buffer.from(data, 'base64')`，adapter 返回 `Uint8Array`

---

## 二、ByteDance Seedream（即梦）

### 关键信息

| 项 | 值 |
|---|---|
| Model ID | `doubao-seedream-4-0-250828`（推荐），也有 3.0 / 4.5 / 5.0 |
| Endpoint | `https://ark.cn-beijing.volces.com/api/v3/images/generations` |
| 国际 Endpoint | `https://ark.ap-southeast.bytepluses.com/api/v3/images/generations` |
| Auth | `Authorization: Bearer ARK_API_KEY`（OpenAI 兼容） |
| 返回格式 | base64 或 URL（由 `response_format` 控制） |
| 同步/异步 | 同步 |
| 参考图 | 支持（`image` 数组，最多 10 张） |
| 价格 | ~0.12-0.26 CNY/张 |
| 延迟 | ~3-10s |

### 支持的尺寸

`512x512`, `1024x1024`, `2048x2048`, `1K`, `2K`, `4K`

### 请求格式（OpenAI 兼容）

```json
{
  "model": "doubao-seedream-4-0-250828",
  "prompt": "A cat sitting on a rainbow",
  "size": "1024x1024",
  "response_format": "b64_json",
  "watermark": false
}
```

### 响应格式

```json
{
  "created": 1700000000,
  "data": [{ "b64_json": "base64..." }]
}
```

### 注意事项

- 不需要 AK/SK 签名，用 Ark 平台 Bearer token 就行
- model ID 里的日期后缀会随版本更新变化，建议 env 覆盖
- `response_format: 'b64_json'` 可直接返回 base64，不用再下载 URL
- 内容审核较严格，可能返回 `content_filter` 错误
- 国内用 `cn-beijing`，海外可用 `ap-southeast`

---

## 三、Alibaba Tongyi Wanxiang（通义万相）

### 关键信息

| 项 | 值 |
|---|---|
| Model ID | `wan2.7-image`（推荐同步）或 `wan2.6-t2i`（异步） |
| Endpoint (wan2.7) | `https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation` |
| Endpoint (wan2.6) | `https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image-generation/generation` |
| 轮询 Endpoint | `GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id}` |
| Auth | `Authorization: Bearer DASHSCOPE_API_KEY` |
| 返回格式 | URL（临时链接，24 小时过期，必须立即下载） |
| 同步/异步 | wan2.7 同步，wan2.6 异步需轮询 |
| 参考图 | 支持（image URL in messages content） |
| 免费额度 | ~50 张（新用户，90 天内） |
| 价格 | 0.20 CNY/张 (~$0.03) |
| 延迟 | ~10-60s |

### 支持的尺寸

格式是 `宽*高`（注意用星号 `*`，不是 `x`）。
常用：`1280*1280`, `1376*768`, `768*1376`, `1024*1024`

### 响应格式（wan2.7 同步）

```json
{
  "output": {
    "choices": [{
      "message": {
        "content": [{ "image": "https://...oss...aliyuncs.com/...png", "type": "image" }]
      }
    }]
  }
}
```

返回的是临时 URL，24 小时过期，必须立即 fetch 下载图片内容。

### 注意事项

- 尺寸格式用星号 `1280*1280` 不是 `1280x1280`
- 返回的是临时 URL，不是 base64；必须立即下载再上传到 Blob
- API key 和 endpoint 必须同 region
- `wan2.6` 是异步需轮询，`wan2.7` 同步直接返回，P6B 推荐用 `wan2.7`

---

## 四、环境变量汇总

```bash
GOOGLE_AI_KEY=AIza...
VOLCENGINE_ARK_API_KEY=...
VOLCENGINE_MODEL_ID=doubao-seedream-4-0-250828
VOLCENGINE_REGION=intl
DASHSCOPE_API_KEY=sk-...
DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com
```

---

## 五、3 个 adapter 对比

| | Gemini Flash | Seedream | 通义万相 |
|---|---|---|---|
| 认证 | `x-goog-api-key` header | Bearer token | Bearer token |
| 返回 | base64 内嵌 | base64 内嵌 | URL（需下载） |
| 同步 | 支持 | 支持 | 支持（`wan2.7`） |
| 复杂度 | 低 | 低 | 中（多一步下载） |
| 推荐先实现 | 第一个 | 第二个 | 第三个 |
| 参考图 | `inlineData` parts | image URL array | message content |
| 比例传参 | 直接传 `"16:9"` | 需转换为像素 | 需转换为像素，`*` 分隔 |
