'use client'

import { useLocale } from '@/components/locale-provider'

export function EditPageHeader() {
  const { locale } = useLocale()

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        {locale === 'zh' ? '编辑图片' : 'Edit Image'}
      </h1>
      <p className="text-sm text-muted-foreground">
        {locale === 'zh'
          ? '上传图片，并描述你想要做的修改。'
          : 'Upload images and describe the changes you want to make.'}
      </p>
    </div>
  )
}
