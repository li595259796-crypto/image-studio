'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  changePasswordAction,
  deleteUserApiKeyAction,
  listUserApiKeysAction,
  saveUserApiKeyAction,
  updateLocaleAction,
  updateProfileAction,
} from '@/app/actions/settings'
import { useLocale } from '@/components/locale-provider'
import { ApiKeysTab } from '@/components/settings/api-keys-tab'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import type { ByokProvider } from '@/lib/byok/providers'
import type { Locale } from '@/lib/i18n'
import {
  createEmptyUserApiKeyViews,
  type UserApiKeyViews,
} from '@/lib/settings/api-keys'

interface SettingsTabsFormProps {
  profile: {
    name: string | null
    email: string
    image: string | null
    locale: string
  }
}

type SettingsTab = 'account' | 'security' | 'apiKeys'

type PendingApiKeyAction =
  | {
      provider: ByokProvider
      kind: 'save' | 'delete'
    }
  | null

function createProviderErrorState(): Record<ByokProvider, string | null> {
  return {
    google: null,
    bytedance: null,
    alibaba: null,
  }
}

export function SettingsTabsForm({ profile }: SettingsTabsFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { setLocale, dictionary } = useLocale()
  const t = dictionary.settings
  const avatarObjectUrlRef = useRef<string | null>(null)

  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [displayName, setDisplayName] = useState(profile.name ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [selectedLocale, setSelectedLocale] = useState<Locale>(
    profile.locale === 'en' ? 'en' : 'zh'
  )
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.image)
  const [apiKeyViews, setApiKeyViews] = useState<UserApiKeyViews>(
    createEmptyUserApiKeyViews()
  )
  const [apiKeyErrors, setApiKeyErrors] = useState<
    Record<ByokProvider, string | null>
  >(createProviderErrorState())
  const [apiKeysLoading, setApiKeysLoading] = useState(true)
  const [apiKeysLoadError, setApiKeysLoadError] = useState<string | null>(null)
  const [pendingApiKeyAction, setPendingApiKeyAction] =
    useState<PendingApiKeyAction>(null)

  const [isProfilePending, startProfileTransition] = useTransition()
  const [isLocalePending, startLocaleTransition] = useTransition()
  const [isPasswordPending, startPasswordTransition] = useTransition()

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function hydrateApiKeys() {
      setApiKeysLoading(true)

      const result = await listUserApiKeysAction()

      if (cancelled) {
        return
      }

      if (!result.success || !result.data) {
        setApiKeysLoadError(result.error ?? t.apiKeys.loadFailed)
        setApiKeysLoading(false)
        return
      }

      setApiKeyViews(result.data.providers)
      setApiKeysLoadError(null)
      setApiKeysLoading(false)
    }

    void hydrateApiKeys()

    return () => {
      cancelled = true
    }
  }, [t.apiKeys.loadFailed])

  function setProviderError(provider: ByokProvider, value: string | null) {
    setApiKeyErrors((current) => ({
      ...current,
      [provider]: value,
    }))
  }

  async function reloadApiKeys(options?: { silent?: boolean }) {
    setApiKeysLoading(true)
    const result = await listUserApiKeysAction()

    if (!result.success || !result.data) {
      const nextError = result.error ?? t.apiKeys.loadFailed
      setApiKeysLoadError(nextError)
      setApiKeysLoading(false)
      if (!options?.silent) {
        toast.error(nextError)
      }
      return false
    }

    setApiKeyViews(result.data.providers)
    setApiKeysLoadError(null)
    setApiKeysLoading(false)
    return true
  }

  function handleAvatarChange(file: File | null) {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current)
      avatarObjectUrlRef.current = null
    }

    setAvatarFile(file)

    if (file) {
      const nextAvatarPreview = URL.createObjectURL(file)
      avatarObjectUrlRef.current = nextAvatarPreview
      setAvatarPreview(nextAvatarPreview)
      return
    }

    setAvatarPreview(profile.image)
  }

  function handleProfileSave() {
    const formData = new FormData()
    formData.set('displayName', displayName)
    if (avatarFile) {
      formData.set('avatar', avatarFile)
    }

    startProfileTransition(async () => {
      const result = await updateProfileAction(formData)

      if (!result.success) {
        toast.error(result.error ?? 'Failed to update profile')
        return
      }

      toast.success(t.profileSuccess)
      router.refresh()
    })
  }

  function handleLocaleChange(nextLocale: 'zh' | 'en') {
    const previousLocale = selectedLocale
    setSelectedLocale(nextLocale)
    setLocale(nextLocale)

    startLocaleTransition(async () => {
      const result = await updateLocaleAction(nextLocale)

      if (!result.success) {
        setSelectedLocale(previousLocale)
        setLocale(previousLocale)
        toast.error(result.error ?? t.localeFailed)
        return
      }

      toast.success(t.localeSuccess)
      router.refresh()
    })
  }

  function handlePasswordChange() {
    setPasswordError(null)

    if (newPassword.length < 8) {
      setPasswordError(t.passwordTooShort)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordMismatch)
      return
    }

    const formData = new FormData()
    formData.set('currentPassword', currentPassword)
    formData.set('newPassword', newPassword)

    startPasswordTransition(async () => {
      const result = await changePasswordAction(formData)

      if (!result.success) {
        setPasswordError(result.error ?? t.currentPasswordWrong)
        return
      }

      toast.success(t.passwordSuccess)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError(null)
    })
  }

  async function handleSaveApiKey(provider: ByokProvider, apiKey: string) {
    setPendingApiKeyAction({ provider, kind: 'save' })
    setProviderError(provider, null)

    const result = await saveUserApiKeyAction({ provider, apiKey })

    if (!result.success) {
      const nextError = result.error ?? t.apiKeys.saveFailed
      setProviderError(provider, nextError)
      setPendingApiKeyAction(null)
      toast.error(nextError)
      return
    }

    await reloadApiKeys({ silent: true })
    setPendingApiKeyAction(null)
    toast.success(t.apiKeys.saveSuccess)
  }

  async function handleDeleteApiKey(provider: ByokProvider) {
    setPendingApiKeyAction({ provider, kind: 'delete' })
    setProviderError(provider, null)

    const result = await deleteUserApiKeyAction(provider)

    if (!result.success) {
      const nextError = result.error ?? t.apiKeys.deleteFailed
      setProviderError(provider, nextError)
      setPendingApiKeyAction(null)
      toast.error(nextError)
      return
    }

    await reloadApiKeys({ silent: true })
    setPendingApiKeyAction(null)
    toast.success(t.apiKeys.deleteSuccess)
  }

  const apiKeysCopy = {
    summary: {
      title: t.apiKeys.summaryTitle,
      description: t.apiKeys.summaryDescription,
      betaLabel: t.apiKeys.betaLabel,
      fairUseLabel: t.apiKeys.fairUseLabel,
      fairUseDescription: t.apiKeys.fairUseDescription,
    },
    shared: {
      currentKeyLabel: t.apiKeys.currentKeyLabel,
      configuredLabel: t.apiKeys.configuredLabel,
      unconfiguredLabel: t.apiKeys.unconfiguredLabel,
      emptyKeyLabel: t.apiKeys.emptyKeyLabel,
      inputLabel: t.apiKeys.inputLabel,
      inputPlaceholder: t.apiKeys.inputPlaceholder,
      saveLabel: t.apiKeys.saveLabel,
      savingLabel: t.apiKeys.savingLabel,
      deleteLabel: t.apiKeys.deleteLabel,
      deletingLabel: t.apiKeys.deletingLabel,
      testLabel: t.apiKeys.testLabel,
      testingLabel: t.apiKeys.testingLabel,
      errorPrefix: t.apiKeys.errorPrefix,
    },
    providers: {
      google: t.apiKeys.providers.google,
      bytedance: t.apiKeys.providers.bytedance,
      alibaba: t.apiKeys.providers.alibaba,
    },
  } as const

  const apiKeyProviders = {
    google: {
      configured: apiKeyViews.google.configured,
      maskedKey: apiKeyViews.google.maskedKey,
      saving:
        pendingApiKeyAction?.provider === 'google' &&
        pendingApiKeyAction.kind === 'save',
      deleting:
        pendingApiKeyAction?.provider === 'google' &&
        pendingApiKeyAction.kind === 'delete',
      error: apiKeyErrors.google,
    },
    bytedance: {
      configured: apiKeyViews.bytedance.configured,
      maskedKey: apiKeyViews.bytedance.maskedKey,
      saving:
        pendingApiKeyAction?.provider === 'bytedance' &&
        pendingApiKeyAction.kind === 'save',
      deleting:
        pendingApiKeyAction?.provider === 'bytedance' &&
        pendingApiKeyAction.kind === 'delete',
      error: apiKeyErrors.bytedance,
    },
    alibaba: {
      configured: apiKeyViews.alibaba.configured,
      maskedKey: apiKeyViews.alibaba.maskedKey,
      saving:
        pendingApiKeyAction?.provider === 'alibaba' &&
        pendingApiKeyAction.kind === 'save',
      deleting:
        pendingApiKeyAction?.provider === 'alibaba' &&
        pendingApiKeyAction.kind === 'delete',
      error: apiKeyErrors.alibaba,
    },
  } as const

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.pageTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.pageDescription}</p>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as SettingsTab)}
      >
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="account">{t.tabs.account}</TabsTrigger>
          <TabsTrigger value="security">{t.tabs.security}</TabsTrigger>
          <TabsTrigger value="apiKeys">{t.tabs.apiKeys}</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.profileSection}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">{t.nameLabel}</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  maxLength={50}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder={t.namePlaceholder}
                />
              </div>

              <div className="space-y-2">
                <Label>{t.avatarLabel}</Label>
                <div className="flex flex-wrap items-center gap-4">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview}
                      alt={displayName || profile.email}
                      className="size-16 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground ring-1 ring-border">
                      {(displayName || profile.email).slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        handleAvatarChange(event.target.files?.[0] ?? null)
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-4" />
                      {t.avatarUpload}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleProfileSave}
                      disabled={isProfilePending}
                    >
                      {isProfilePending ? t.saving : t.saveButton}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.languageSection}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>{t.languageLabel}</Label>
              <Select
                value={selectedLocale}
                onValueChange={(value) =>
                  handleLocaleChange(value as 'zh' | 'en')
                }
                disabled={isLocalePending}
              >
                <SelectTrigger className="min-w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.securitySection}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t.currentPassword}</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">{t.newPassword}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t.confirmPassword}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>

              {passwordError ? (
                <p className="text-sm text-destructive">{passwordError}</p>
              ) : null}

              <Button
                type="button"
                onClick={handlePasswordChange}
                disabled={isPasswordPending}
              >
                {isPasswordPending ? t.changingPassword : t.changePasswordButton}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apiKeys" className="space-y-6">
          {apiKeysLoading ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t.apiKeys.loadingLabel}
              </CardContent>
            </Card>
          ) : null}

          {apiKeysLoadError ? (
            <Card>
              <CardContent className="flex flex-wrap items-center gap-3 pt-6">
                <p className="text-sm text-destructive">{apiKeysLoadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void reloadApiKeys()
                  }}
                >
                  {t.apiKeys.retryLabel}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <ApiKeysTab
            copy={apiKeysCopy}
            providers={apiKeyProviders}
            testingEnabled={false}
            onSave={handleSaveApiKey}
            onDelete={handleDeleteApiKey}
            onTest={async () => {
              toast.message(t.apiKeys.testUnavailable)
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
