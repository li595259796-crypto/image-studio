import type {
  ExcalidrawImageElement,
  ExcalidrawRectangleElement,
  ExcalidrawTextElement,
  FileId,
} from '@excalidraw/excalidraw/element/types'

const CARD_WIDTH = 280
const CARD_HEIGHT = 280
const CARD_GAP = 320
const CARD_Y = 96

export function createGenerationPlaceholderElement({
  modelId,
  index,
  placeholderKey,
}: {
  modelId: string
  index: number
  placeholderKey: string
}): ExcalidrawRectangleElement {
  return {
    ...createBaseElement({
      type: 'rectangle',
      x: CARD_GAP * index,
      y: CARD_Y,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      backgroundColor: '#f3efe3',
      strokeColor: '#9a8f76',
      customData: { kind: 'generation-placeholder', modelId, placeholderKey },
    }),
    type: 'rectangle',
  } as ExcalidrawRectangleElement
}

export function createGenerationLabelElement({
  modelLabel,
  placeholderKey,
  x,
  y,
  kind,
}: {
  modelLabel: string
  placeholderKey?: string
  x: number
  y: number
  kind: 'placeholder' | 'result'
}): ExcalidrawTextElement {
  return {
    ...createBaseElement({
      type: 'text',
      x,
      y,
      width: Math.max(120, modelLabel.length * 10),
      height: 28,
      backgroundColor: kind === 'placeholder' ? '#f3efe3' : 'transparent',
      strokeColor: '#435063',
      customData: { kind: `generation-${kind}-label`, placeholderKey },
    }),
    type: 'text',
    fontSize: 18,
    fontFamily: 1,
    text: modelLabel,
    textAlign: 'left',
    verticalAlign: 'top',
    containerId: null,
    originalText: modelLabel,
    autoResize: true,
    lineHeight: 1.25 as ExcalidrawTextElement['lineHeight'],
  } as ExcalidrawTextElement
}

export function createGeneratedImageElement({
  fileId,
  x,
  y,
  width,
  height,
}: {
  fileId: FileId
  x: number
  y: number
  width: number
  height: number
}): ExcalidrawImageElement {
  return {
    ...createBaseElement({
      type: 'image',
      x,
      y,
      width,
      height,
      backgroundColor: 'transparent',
      strokeColor: '#435063',
      customData: { kind: 'generation-result', fileId },
    }),
    type: 'image',
    fileId,
    status: 'saved',
    scale: [1, 1],
    crop: null,
  } as ExcalidrawImageElement
}

function createBaseElement({
  type,
  x,
  y,
  width,
  height,
  strokeColor,
  backgroundColor,
  customData,
}: {
  type: 'rectangle' | 'image' | 'text'
  x: number
  y: number
  width: number
  height: number
  strokeColor: string
  backgroundColor: string
  customData?: Record<string, unknown>
}) {
  return {
    id: crypto.randomUUID(),
    type,
    x,
    y,
    width,
    height,
    strokeColor,
    backgroundColor,
    fillStyle: 'solid' as const,
    strokeWidth: 1,
    strokeStyle: 'solid' as const,
    roundness: { type: 3 as const },
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: Math.floor(Math.random() * 10_000_000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 10_000_000),
    index: null,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    customData,
  }
}
