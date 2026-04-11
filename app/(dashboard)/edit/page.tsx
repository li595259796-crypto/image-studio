import { EditForm } from '@/components/edit-form'

export const maxDuration = 300

interface EditPageProps {
  searchParams: Promise<{
    prompt?: string
    sourceUrl?: string
  }>
}

export default async function EditPage({ searchParams }: EditPageProps) {
  const params = await searchParams
  const editFormKey = `${params.prompt ?? ''}::${params.sourceUrl ?? ''}`

  return (
    <div className="mx-auto max-w-2xl">
      <EditForm key={editFormKey} />
    </div>
  )
}
