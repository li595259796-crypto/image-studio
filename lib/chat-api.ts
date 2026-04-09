'use server'

import { auth } from '@/lib/auth'

const API_KEY = process.env.IMAGE_API_KEY ?? ''
const API_URL = process.env.IMAGE_API_URL ?? 'https://147ai.com/v1/chat/completions'
const CHAT_MODEL = process.env.CHAT_MODEL ?? 'gemini-2.0-flash'
const TIMEOUT_MS = 30_000

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  choices: Array<{
    message: { content: string }
  }>
}

export async function chatRefine(
  scenarioId: string,
  userDescription: string
): Promise<{ success: boolean; refined?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Authentication required' }
  }

  if (!API_KEY) {
    return { success: false, error: 'API not configured' }
  }

  const scenarioContext: Record<string, string> = {
    product: '用户正在制作商品图，需要描述商品背景和风格。检查是否缺少：主体描述、背景、风格。',
    cover: '用户正在制作封面视觉，需要主题配图。检查是否缺少：主题、色调、氛围。',
    poster: '用户正在制作海报底图，需要视觉素材。检查是否缺少：用途、氛围、色系。',
    portrait: '用户正在制作风格头像。检查是否缺少：风格细节、色调。',
    illustration: '用户正在制作创意插画。检查是否缺少：主题、风格、构图。',
    freeform: '用户正在自由创作图片，帮助完善描述。',
  }

  const systemPrompt = [
    '你是一个 AI 图片生成助手。用户给了一段简短描述，你的任务是：',
    '1. 根据场景类型检查描述是否缺少关键信息',
    '2. 如果缺少，问 1-2 个简短问题',
    '3. 如果足够，直接给出优化后的描述',
    '回复请简短，不超过 100 字。直接回复，不要解释你在做什么。',
    '',
    `场景：${scenarioContext[scenarioId] ?? scenarioContext.freeform}`,
  ].join('\n')

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userDescription || '(用户还没写描述)' },
  ]

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages,
        max_tokens: 512,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      await response.text()
      return { success: false, error: 'AI refinement failed' }
    }

    const data = (await response.json()) as ChatResponse
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return { success: false, error: 'Empty AI response' }
    }

    return { success: true, refined: content }
  } catch {
    return { success: false, error: 'Refinement request timed out' }
  } finally {
    clearTimeout(timeoutId)
  }
}
