'use client'

import dynamic from 'next/dynamic'
import {
  pickPersistedAppState,
  toExcalidrawInitialData,
  type PersistedCanvasState,
} from '@/lib/canvas/state'
import type {
  AppState,
  BinaryFiles,
} from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw')
    return mod.Excalidraw
  },
  { ssr: false }
)

function toPersistedCanvasState(
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles
): PersistedCanvasState {
  return {
    elements: [...elements],
    appState: pickPersistedAppState(appState as unknown as Record<string, unknown>),
    files: { ...files },
  }
}

export function ExcalidrawBoard({
  initialData,
  onSnapshotChange,
}: {
  initialData: PersistedCanvasState
  onSnapshotChange: (nextState: PersistedCanvasState) => void
}) {
  return (
    <div className="relative h-[70vh] min-h-[620px] overflow-hidden rounded-[32px] border border-border/70 bg-[#f7f4ee]">
      <Excalidraw
        initialData={toExcalidrawInitialData(initialData)}
        theme="light"
        gridModeEnabled
        viewModeEnabled={false}
        zenModeEnabled={false}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: true,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: false,
          },
        }}
        onChange={(elements, appState, files) => {
          onSnapshotChange(toPersistedCanvasState(elements, appState, files))
        }}
      />
    </div>
  )
}
