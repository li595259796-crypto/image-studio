export const DEFAULT_CANVAS_NAME = 'Untitled Canvas'
export const CANVAS_STATE_MAX_BYTES = 5_000_000
export const CANVAS_ASSET_LIMIT = 100

export interface PersistedCanvasState {
  elements: unknown[]
  appState: Record<string, unknown>
  files: Record<string, unknown>
}

export function createEmptyCanvasState(): PersistedCanvasState {
  return {
    elements: [],
    appState: {
      viewBackgroundColor: '#f7f4ee',
      gridSize: null,
      zenModeEnabled: false,
    },
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
