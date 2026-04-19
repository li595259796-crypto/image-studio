import type {
  BinaryFiles,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

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

export function sanitizeCanvasName(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 120) : DEFAULT_CANVAS_NAME
}

/**
 * Validate that `raw` is a structurally valid PersistedCanvasState.
 * Used on both write (server action) and read (DB → component) paths.
 * Does NOT use Zod to avoid adding a direct dependency for a single use site.
 */
export function parseCanvasState(raw: unknown): PersistedCanvasState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Canvas state must be a non-null object')
  }

  const obj = raw as Record<string, unknown>

  if (!Array.isArray(obj.elements)) {
    throw new Error('Canvas state.elements must be an array')
  }

  if (obj.elements.length > 10_000) {
    throw new Error('Canvas state.elements exceeds 10,000 entries')
  }

  if (!obj.appState || typeof obj.appState !== 'object') {
    throw new Error('Canvas state.appState must be an object')
  }

  if (obj.files !== null && obj.files !== undefined && typeof obj.files !== 'object') {
    throw new Error('Canvas state.files must be an object or null')
  }

  const files = (obj.files ?? {}) as Record<string, unknown>
  const fileCount = Object.keys(files).length
  if (fileCount > CANVAS_ASSET_LIMIT) {
    throw new Error(`Canvas files exceed limit of ${CANVAS_ASSET_LIMIT}`)
  }

  return {
    elements: obj.elements as readonly ExcalidrawElement[],
    appState: pickPersistedAppState(obj.appState as Record<string, unknown>),
    files: files as BinaryFiles,
  }
}

/**
 * Check that serialized canvas state is within the byte size limit.
 * Uses TextEncoder for browser compatibility (no Node.js Buffer dependency).
 */
export function assertCanvasStateWithinLimit(value: unknown): string {
  const serialized = JSON.stringify(value)
  const size = new TextEncoder().encode(serialized).length

  if (size > CANVAS_STATE_MAX_BYTES) {
    throw new Error(`Canvas state exceeds ${CANVAS_STATE_MAX_BYTES} bytes`)
  }

  return serialized
}

// Adapter: PersistedCanvasState → Excalidraw initialData.
// Excalidraw merges missing appState fields with its own defaults,
// so passing our narrow PersistedCanvasAppState is safe.
export function toExcalidrawInitialData(
  value: PersistedCanvasState
): ExcalidrawInitialDataState {
  return {
    elements: value.elements,
    appState: value.appState as ExcalidrawInitialDataState['appState'],
    files: value.files,
  }
}
