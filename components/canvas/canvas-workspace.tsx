'use client'

import type { CanvasRecord } from '@/lib/db/canvas-queries'
import type { RecoverableGenerationJob } from '@/lib/db/generation-queries'
import {
  assertCanvasStateWithinLimit,
  createEmptyCanvasState,
  parseCanvasState,
} from '@/lib/canvas/state'
import { getModelDefinition } from '@/lib/models/constants'
import type { ModelId } from '@/lib/models/types'
import {
  ExcalidrawBoard,
  type CanvasBoardHandle,
} from '@/components/canvas/excalidraw-board'
import { CanvasToolbar } from '@/components/canvas/canvas-toolbar'
import { GenerationPanel } from '@/components/canvas/generation-panel'
import { useCanvasAutosave } from '@/hooks/use-canvas-autosave'
import { useEffect, useMemo, useRef } from 'react'

export function CanvasWorkspace({
  canvas,
  recoverableJobs,
}: {
  canvas: CanvasRecord
  recoverableJobs: RecoverableGenerationJob[]
}) {
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
  const boardRef = useRef<CanvasBoardHandle | null>(null)
  const recoveredImageIdsRef = useRef(new Set<string>())

  useEffect(() => {
    const existingImageIds = new Set<string>()

    for (const element of initialState.elements) {
      if (element.type === 'image' && typeof element.fileId === 'string') {
        existingImageIds.add(element.fileId)
      }
    }

    for (const fileId of Object.keys(initialState.files)) {
      existingImageIds.add(fileId)
    }

    void (async () => {
      for (const [index, job] of recoverableJobs.entries()) {
        if (
          !job.imageId ||
          existingImageIds.has(job.imageId) ||
          recoveredImageIdsRef.current.has(job.imageId)
        ) {
          continue
        }

        recoveredImageIdsRef.current.add(job.imageId)
        existingImageIds.add(job.imageId)

        try {
          await boardRef.current?.replacePlaceholderWithImage({
            placeholderKey: `recovery:${job.id}`,
            modelLabel: getModelDefinition(job.modelId as ModelId).label,
            imageId: job.imageId,
            blobUrl: job.blobUrl,
            fallbackIndex: index,
          })
        } catch {
          recoveredImageIdsRef.current.delete(job.imageId)
        }
      }
    })()
  }, [initialState.elements, initialState.files, recoverableJobs])

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <CanvasToolbar
          canvasId={canvas.id}
          initialName={canvas.name}
          status={status}
        />
        <ExcalidrawBoard
          ref={boardRef}
          initialData={initialState}
          onSnapshotChange={queueSave}
        />
      </div>
      <GenerationPanel
        canvasId={canvas.id}
        onStart={(items) => {
          for (const item of items) {
            boardRef.current?.insertGenerationPlaceholder(item)
          }
        }}
        onCompleted={async (job) => {
          if (!job.imageId || !job.blobUrl) {
            return
          }

          await boardRef.current?.replacePlaceholderWithImage({
            placeholderKey: job.placeholderKey,
            modelLabel: job.modelLabel,
            imageId: job.imageId,
            blobUrl: job.blobUrl,
          })
        }}
      />
    </div>
  )
}
