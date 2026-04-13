import { getModelDefinition } from './constants.ts'
import { geminiFlashAdapter } from './gemini-flash.ts'
import { seedreamAdapter } from './seedream.ts'
import { tongyiAdapter } from './tongyi.ts'
import type {
  AdapterResult,
  GenerateOptions,
  ModelAdapter,
  ModelId,
} from './types.ts'

const adapters = new Map<ModelId, ModelAdapter>()

export function registerModelAdapter(adapter: ModelAdapter): void {
  adapters.set(adapter.definition.id, adapter)
}

export function getModelAdaptersForIds(modelIds: ModelId[]): ModelAdapter[] {
  return modelIds.map((modelId) => {
    const adapter = adapters.get(modelId)
    if (!adapter) {
      const definition = getModelDefinition(modelId)
      throw new Error(`Adapter not registered for model: ${definition.label}`)
    }

    return adapter
  })
}

export async function runModelGeneration(input: {
  adapter: ModelAdapter
  options: GenerateOptions
}): Promise<AdapterResult> {
  const startedAt = Date.now()

  try {
    return await input.adapter.generate(input.options)
  } catch (error: unknown) {
    return {
      ok: false,
      errorCode: 'provider_error',
      message:
        error instanceof Error ? error.message : 'Unknown provider failure',
      durationMs: Date.now() - startedAt,
    }
  }
}

registerModelAdapter(geminiFlashAdapter)
registerModelAdapter(seedreamAdapter)
registerModelAdapter(tongyiAdapter)
