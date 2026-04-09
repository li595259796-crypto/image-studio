'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useLocale } from '@/components/locale-provider'
import { updateLocaleAction, updateProfileAction, changePasswordAction } from '@/app/actions/settings'
import type { Locale } from '@/lib/i18n'
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

interface SettingsFormProps {
  profile: {
    name: string | null
    email: string
    image: string | null
    locale: string
  }
}

export function SettingsForm({ profile }: SettingsFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { locale, setLocale, dictionary } = useLocale()
  const t = dictionary.settings

  const [displayName, setDisplayName] = useState(profile.name ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [selectedLocale, setSelectedLocale] = useState<Locale>(
    profile.locale === 'en' ? 'en' : 'zh'
  )
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [isProfilePending, startProfileTransition] = useTransition()
  const [isLocalePending, startLocaleTransition] = useTransition()
  const [isPasswordPending, startPasswordTransition] = useTransition()

  const avatarPreview = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile)
    }

    return profile.image
  }, [avatarFile, profile.image])

  function handleAvatarChange(file: File | null) {
    setAvatarFile(file)
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.pageTitle}</h1>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </div>

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
            onValueChange={(value) => handleLocaleChange(value as 'zh' | 'en')}
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

          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}

          <Button
            type="button"
            onClick={handlePasswordChange}
            disabled={isPasswordPending}
          >
            {isPasswordPending ? t.changingPassword : t.changePasswordButton}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
