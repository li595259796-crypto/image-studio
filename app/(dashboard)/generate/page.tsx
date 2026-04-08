import { GenerateForm } from '@/components/generate-form'

export default function GeneratePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Generate Image
        </h1>
        <p className="text-sm text-muted-foreground">
          Describe what you want and let AI create it for you.
        </p>
      </div>
      <GenerateForm />
    </div>
  )
}
