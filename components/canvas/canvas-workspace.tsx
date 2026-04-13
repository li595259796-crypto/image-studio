'use client'

import type { CanvasRecord } from '@/lib/db/canvas-queries'
import { type PersistedCanvasState, assertCanvasStateWithinLimit } from '@/lib/canvas/state'
import { ExcalidrawBoard } from '@/components/canvas/excalidraw-board'
import { CanvasToolbar } from '@/components/canvas/canvas-toolbar'
import { useCanvasAutosave } from '@/hooks/use-canvas-autosave'

export function CanvasWorkspace({ canvas }: { canvas: CanvasRecord }) {
  const initialState = canvas.state as PersistedCanvasState
  const initialSerialized = assertCanvasStateWithinLimit(initialState)
  const { queueSave, status } = useCanvasAutosave(
    canvas.id,
    initialState,
    initialSerialized
  )

  return (
    <div className="space-y-4">
      <CanvasToolbar
        canvasId={canvas.id}
        initialName={canvas.name}
        status={status}
      />
      <ExcalidrawBoard initialData={initialState} onSnapshotChange={queueSave} />
    </div>
  )
}
