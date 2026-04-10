import { EditForm } from '@/components/edit-form'

export const maxDuration = 300

export default function EditPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Image</h1>
        <p className="text-sm text-muted-foreground">
          Upload images and describe the changes you want to make.
        </p>
      </div>
      <EditForm />
    </div>
  )
}
