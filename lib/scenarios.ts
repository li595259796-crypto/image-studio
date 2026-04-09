export type ScenarioId =
  | 'product'
  | 'cover'
  | 'poster'
  | 'portrait'
  | 'illustration'
  | 'freeform'

export type InputType = 'upload' | 'text'

export interface ScenarioConfig {
  id: ScenarioId
  icon: string
  defaultAspectRatio: string
  defaultQuality: string
  inputType: InputType
  aspectRatios: string[]
  promptTemplate: string
  stylePresets?: string[]
  editIntent: string
}

export const scenarios: ScenarioConfig[] = [
  {
    id: 'product',
    icon: '🛒',
    defaultAspectRatio: '1:1',
    defaultQuality: '2K',
    inputType: 'upload',
    aspectRatios: ['1:1', '4:3', '3:4'],
    promptTemplate: 'Product photo: {描述}, clean background, commercial photography',
    editIntent: '调整背景和光线',
  },
  {
    id: 'cover',
    icon: '📱',
    defaultAspectRatio: '16:9',
    defaultQuality: '2K',
    inputType: 'text',
    aspectRatios: ['16:9', '4:3', '1:1'],
    promptTemplate: 'Visual artwork for: {描述}, modern, vibrant, eye-catching composition',
    editIntent: '调整色调和构图',
  },
  {
    id: 'poster',
    icon: '📄',
    defaultAspectRatio: '3:4',
    defaultQuality: '2K',
    inputType: 'text',
    aspectRatios: ['3:4', '4:3', '1:1'],
    promptTemplate: 'Background artwork: {描述}, atmospheric, high resolution, suitable as poster base',
    editIntent: '调整色调和氛围',
  },
  {
    id: 'portrait',
    icon: '👤',
    defaultAspectRatio: '1:1',
    defaultQuality: '2K',
    inputType: 'upload',
    aspectRatios: ['1:1'],
    promptTemplate: 'Portrait in {风格} style: {描述}, artistic, detailed',
    stylePresets: ['油画', '水彩', '动漫', '赛博朋克', '素描', '3D 卡通', '复古胶片', '极简'],
    editIntent: '调整风格细节',
  },
  {
    id: 'illustration',
    icon: '🎨',
    defaultAspectRatio: '1:1',
    defaultQuality: '2K',
    inputType: 'text',
    aspectRatios: ['1:1', '16:9', '4:3'],
    promptTemplate: 'Illustration: {描述}, artistic style, creative, detailed',
    editIntent: '调整画面细节',
  },
  {
    id: 'freeform',
    icon: '✏️',
    defaultAspectRatio: '16:9',
    defaultQuality: '2K',
    inputType: 'text',
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    promptTemplate: '',
    editIntent: '保留主体，优化背景和光线',
  },
]

export function getScenario(id: ScenarioId): ScenarioConfig {
  return scenarios.find((s) => s.id === id)!
}

export function buildPrompt(
  scenario: ScenarioConfig,
  description: string,
  style?: string
): string {
  if (scenario.id === 'freeform') return description
  let prompt = scenario.promptTemplate.replace('{描述}', description)
  if (style) {
    prompt = prompt.replace('{风格}', style)
  } else {
    prompt = prompt.replace('{风格}', '')
  }
  return prompt
}
