'use client'

import { useId, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  SUPPORTED_BYOK_PROVIDERS,
  type ByokProvider,
} from '@/lib/byok/providers'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ApiKeyProviderState = {
  configured: boolean
  maskedKey: string | null
  saving?: boolean
  deleting?: boolean
  testing?: boolean
  error?: string | null
}

type ApiKeysTabCopy = {
  summary: {
    title: string
    description: string
    betaLabel: string
    fairUseLabel: string
    fairUseDescription: string
  }
  shared: {
    currentKeyLabel: string
    configuredLabel: string
    unconfiguredLabel: string
    emptyKeyLabel: string
    inputLabel: string
    inputPlaceholder: string
    saveLabel: string
    savingLabel: string
    deleteLabel: string
    deletingLabel: string
    testLabel: string
    testingLabel: string
    errorPrefix: string
  }
  providers: Record<
    ByokProvider,
    {
      title: string
      description: string
    }
  >
}

export interface ApiKeysTabProps {
  copy: ApiKeysTabCopy
  providers: Record<ByokProvider, ApiKeyProviderState>
  testingEnabled?: boolean
  onSave: (provider: ByokProvider, apiKey: string) => void | Promise<void>
  onDelete: (provider: ByokProvider) => void | Promise<void>
  onTest: (provider: ByokProvider) => void | Promise<void>
}

export function ApiKeysTab({
  copy,
  providers,
  testingEnabled = true,
  onSave,
  onDelete,
  onTest,
}: ApiKeysTabProps) {
  const inputIdPrefix = useId()
  const [drafts, setDrafts] = useState<Record<ByokProvider, string>>({
    google: '',
    bytedance: '',
    alibaba: '',
  })

  async function runSafely(action: () => void | Promise<void>) {
    try {
      await action()
    } catch {
      // Parent state owns persistence failures; keep this layer resilient.
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{copy.summary.title}</CardTitle>
          <CardDescription>{copy.summary.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{copy.summary.betaLabel}</Badge>
            <Badge variant="outline">{copy.summary.fairUseLabel}</Badge>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {copy.summary.fairUseDescription}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {SUPPORTED_BYOK_PROVIDERS.map((providerId) => {
          const provider = providers[providerId]
          const providerCopy = copy.providers[providerId]
          const draft = drafts[providerId]
          const inputId = `${inputIdPrefix}-${providerId}-api-key`
          const isSaving = Boolean(provider.saving)
          const isDeleting = Boolean(provider.deleting)
          const isTesting = Boolean(provider.testing)
          const isBusy = isSaving || isDeleting || isTesting
          const trimmedDraft = draft.trim()
          const canSave = trimmedDraft.length > 0 && !isBusy
          const canDelete = provider.configured && !isBusy
          const canTest = testingEnabled && provider.configured && !isBusy

          return (
            <Card key={providerId} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>{providerCopy.title}</CardTitle>
                    <CardDescription>{providerCopy.description}</CardDescription>
                  </div>
                  <Badge variant={provider.configured ? 'secondary' : 'outline'}>
                    {provider.configured
                      ? copy.shared.configuredLabel
                      : copy.shared.unconfiguredLabel}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault()

                    if (!canSave) {
                      return
                    }

                    await runSafely(() => onSave(providerId, trimmedDraft))
                  }}
                >
                  <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/30 p-3">
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {copy.shared.currentKeyLabel}
                    </div>
                    <div className="font-mono text-sm leading-6 text-foreground">
                      {provider.maskedKey ?? copy.shared.emptyKeyLabel}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={inputId}>{copy.shared.inputLabel}</Label>
                    <Input
                      id={inputId}
                      value={draft}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [providerId]: event.target.value,
                        }))
                      }
                      placeholder={copy.shared.inputPlaceholder}
                      disabled={isBusy}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>

                  {provider.error ? (
                    <p
                      className="text-sm leading-6 text-destructive"
                      aria-live="polite"
                    >
                      <span className="font-medium">{copy.shared.errorPrefix}</span>{' '}
                      {provider.error}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={!canSave}>
                      {isSaving ? copy.shared.savingLabel : copy.shared.saveLabel}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canTest}
                      onClick={() => {
                        void runSafely(() => onTest(providerId))
                      }}
                    >
                      {isTesting ? copy.shared.testingLabel : copy.shared.testLabel}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={!canDelete}
                      onClick={() => {
                        void runSafely(() => onDelete(providerId))
                      }}
                    >
                      {isDeleting
                        ? copy.shared.deletingLabel
                        : copy.shared.deleteLabel}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
