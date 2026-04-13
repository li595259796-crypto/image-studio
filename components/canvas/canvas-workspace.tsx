'use client'

import type { CanvasRecord } from '@/lib/db/canvas-queries'
import {
  assertCanvasStateWithinLimit,
  createEmptyCanvasState,
  parseCanvasState,
} from '@/lib/canvas/state'
import { ExcalidrawBoard } from '@/components/canvas/excalidraw-board'
import { CanvasToolbar } from '@/components/canvas/canvas-toolbar'
import { useCanvasAutosave } from '@/hooks/use-canvas-autosave'
import { useMemo } from 'react'

export function CanvasWorkspace({ canvas }: { canvas: CanvasRecord }) {
  // Validate DB data at the read boundary — raw JSONB is unknown at runtime
  // even though Drizzle's .$type<> says PersistedCanvasState at compile time.
  const { initialState, initialSerialized } = useMemo(() => {
    try {
      const validated = parseCanvasState(canvas.state)
      return {
        initialState: validated,
        initialSerialized: assertCanvasStateWithinLimit(validated),
      }
    } catch {
      // Corrupted canvas state — fall back to empty canvas rather than crashing
      const empty = createEmptyCanvasState()
      return {
        initialState: empty,
        initialSerialized: JSON.stringify(empty),
      }
    }
  }, [canvas.state])

  const { queueSave, status } = useCanvasAutosave(canvas.id, initialSerialized)

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
