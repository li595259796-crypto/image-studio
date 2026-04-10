import { EditPageHeader } from '@/components/edit-page-header'
import { EditForm } from '@/components/edit-form'

export const maxDuration = 300

export default function EditPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <EditPageHeader />
      <EditForm />
    </div>
  )
}
