'use client'

import dynamic from 'next/dynamic'
import { CaptureUpdateAction } from '@excalidraw/excalidraw'
// Excalidraw CSS (141 KB) moved here from app/layout.tsx — was render-blocking
// every route including the landing page. Importing here keeps it scoped to
// routes that actually mount the canvas board.
import '@excalidraw/excalidraw/index.css'
import {
  pickPersistedAppState,
  toExcalidrawInitialData,
  type PersistedCanvasState,
} from '@/lib/canvas/state'
import {
  createGeneratedImageElement,
  createGenerationLabelElement,
  createGenerationPlaceholderElement,
} from '@/lib/canvas/generation-elements'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import type {
  AppState,
  BinaryFiles,
  BinaryFileData,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types'
import type {
  ExcalidrawElement,
  FileId,
} from '@excalidraw/excalidraw/element/types'

function CanvasLoadingSkeleton() {
  return (
    <div className="flex size-full items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        <span>加载画布中…</span>
      </div>
    </div>
  )
}

const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw')
    return mod.Excalidraw
  },
  { ssr: false, loading: CanvasLoadingSkeleton }
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

function isModelPlaceholder(
  element: ExcalidrawElement,
  placeholderKey: string
): boolean {
  return (
    !element.isDeleted &&
    element.customData?.kind === 'generation-placeholder' &&
    element.customData?.placeholderKey === placeholderKey
  )
}

function isGenerationLabel(
  element: ExcalidrawElement,
  kind: 'placeholder' | 'result',
  placeholderKey: string
): boolean {
  return (
    !element.isDeleted &&
    element.type === 'text' &&
    element.customData?.kind === `generation-${kind}-label` &&
    element.customData?.placeholderKey === placeholderKey
  )
}

function markDeleted<TElement extends ExcalidrawElement>(element: TElement): TElement {
  return {
    ...element,
    isDeleted: true,
    updated: Date.now(),
    version: element.version + 1,
    versionNonce: Math.floor(Math.random() * 10_000_000),
  }
}

async function blobUrlToFileData(
  imageId: string,
  blobUrl: string
): Promise<{
  file: BinaryFileData
  width: number
  height: number
}> {
  const response = await fetch(blobUrl)
  if (!response.ok) {
    throw new Error(`Failed to load generated image: ${response.status}`)
  }

  const blob = await response.blob()
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const image = new Image()
      image.onload = () =>
        resolve({
          width: image.naturalWidth || 1024,
          height: image.naturalHeight || 1024,
        })
      image.onerror = () => reject(new Error('Failed to decode generated image'))
      image.src = dataUrl
    }
  )

  return {
    file: {
      id: imageId as FileId,
      mimeType:
        blob.type === 'image/jpeg' || blob.type === 'image/webp'
          ? blob.type
          : 'image/png',  // fallback for octet-stream and unknown types
      dataURL: dataUrl as BinaryFileData['dataURL'],
      created: Date.now(),
      lastRetrieved: Date.now(),
    },
    width: dimensions.width,
    height: dimensions.height,
  }
}

export interface CanvasBoardHandle {
  insertGenerationPlaceholder(input: {
    modelId: string
    modelLabel: string
    index: number
    placeholderKey: string
  }): void
  replacePlaceholderWithImage(input: {
    placeholderKey: string
    modelLabel: string
    imageId: string
    blobUrl: string
    fallbackIndex?: number
  }): Promise<void>
}

export const ExcalidrawBoard = forwardRef<CanvasBoardHandle, {
  initialData: PersistedCanvasState
  onSnapshotChange: (nextState: PersistedCanvasState) => void
}>(function ExcalidrawBoard({
  initialData,
  onSnapshotChange,
}, ref) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)

  useImperativeHandle(ref, () => ({
    insertGenerationPlaceholder({ modelId, modelLabel, index, placeholderKey }) {
      const api = apiRef.current
      if (!api) return

      const placeholder = createGenerationPlaceholderElement({
        modelId,
        index,
        placeholderKey,
      })
      const label = createGenerationLabelElement({
        modelLabel,
        placeholderKey,
        x: placeholder.x + 18,
        y: placeholder.y + 18,
        kind: 'placeholder',
      })

      api.updateScene({
        elements: [
          ...api.getSceneElements(),
          placeholder,
          label,
        ],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      })
    },
    async replacePlaceholderWithImage({
      placeholderKey,
      modelLabel,
      imageId,
      blobUrl,
      fallbackIndex,
    }) {
      const api = apiRef.current
      if (!api) return

      const fileData = await blobUrlToFileData(imageId, blobUrl)
      const elements = [...api.getSceneElementsIncludingDeleted()]
      const placeholder = [...elements].reverse().find((element) =>
        isModelPlaceholder(element, placeholderKey)
      )

      const fallbackPlaceholder =
        typeof fallbackIndex === 'number'
          ? createGenerationPlaceholderElement({
              modelId: 'recovery',
              index: fallbackIndex,
              placeholderKey,
            })
          : null

      const nextX = placeholder?.x ?? fallbackPlaceholder?.x ?? 0
      const nextY = placeholder?.y ?? fallbackPlaceholder?.y ?? 0
      const imageElement = createGeneratedImageElement({
        fileId: imageId as FileId,
        x: nextX,
        y: nextY,
        width: fileData.width,
        height: fileData.height,
      })
      const label = createGenerationLabelElement({
        modelLabel,
        placeholderKey,
        x: nextX + 18,
        y: nextY + 18,
        kind: 'result',
      })

      const nextElements = elements.map((element) => {
        if (
          isModelPlaceholder(element, placeholderKey) ||
          isGenerationLabel(element, 'placeholder', placeholderKey)
        ) {
          return markDeleted(element)
        }

        return element
      })

      api.addFiles([fileData.file])
      api.updateScene({
        elements: [...nextElements, imageElement, label],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      })
    },
  }), [])

  return (
    <div className="relative h-[70vh] min-h-[620px] overflow-hidden rounded-[32px] border border-border/70 bg-[#f7f4ee]">
      <Excalidraw
        initialData={toExcalidrawInitialData(initialData)}
        excalidrawAPI={(api) => {
          apiRef.current = api
        }}
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
})
