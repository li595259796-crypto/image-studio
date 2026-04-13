import type {
  BinaryFiles,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

export const DEFAULT_CANVAS_NAME = 'Untitled Canvas'
export const CANVAS_STATE_MAX_BYTES = 5_000_000
export const CANVAS_ASSET_LIMIT = 100

export interface PersistedCanvasAppState {
  viewBackgroundColor: string
  gridSize: number | null
  zenModeEnabled: boolean
  scrollX: number
  scrollY: number
  zoom: { value: number }
}

export interface PersistedCanvasState {
  elements: readonly ExcalidrawElement[]
  appState: PersistedCanvasAppState
  files: BinaryFiles
}

export function pickPersistedAppState(
  value: Partial<PersistedCanvasAppState> & Record<string, unknown>
): PersistedCanvasAppState {
  return {
    viewBackgroundColor:
      typeof value.viewBackgroundColor === 'string'
        ? value.viewBackgroundColor
        : '#f7f4ee',
    gridSize:
      typeof value.gridSize === 'number' || value.gridSize === null
        ? value.gridSize
        : null,
    zenModeEnabled:
      typeof value.zenModeEnabled === 'boolean' ? value.zenModeEnabled : false,
    scrollX: typeof value.scrollX === 'number' ? value.scrollX : 0,
    scrollY: typeof value.scrollY === 'number' ? value.scrollY : 0,
    zoom:
      value.zoom &&
      typeof value.zoom === 'object' &&
      'value' in value.zoom &&
      typeof value.zoom.value === 'number'
        ? { value: value.zoom.value }
        : { value: 1 },
  }
}

export function createEmptyCanvasState(): PersistedCanvasState {
  return {
    elements: [],
    appState: pickPersistedAppState({
      viewBackgroundColor: '#f7f4ee',
      gridSize: null,
      zenModeEnabled: false,
    }),
    files: {},
  }
}

export function sanitizeCanvasName(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 120) : DEFAULT_CANVAS_NAME
}

export function assertCanvasStateWithinLimit(value: unknown) {
  const serialized = JSON.stringify(value)
  const size = Buffer.byteLength(serialized, 'utf8')

  if (size > CANVAS_STATE_MAX_BYTES) {
    throw new Error(`Canvas state exceeds ${CANVAS_STATE_MAX_BYTES} bytes`)
  }

  return serialized
}

export function toExcalidrawInitialData(
  value: PersistedCanvasState
): ExcalidrawInitialDataState {
  return {
    elements: value.elements,
    appState: value.appState as ExcalidrawInitialDataState['appState'],
    files: value.files,
  }
}
