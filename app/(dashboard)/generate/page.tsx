import { GeneratePageClient } from '@/components/generate-page-client'

export const maxDuration = 300

interface GeneratePageProps {
  searchParams: Promise<{
    mode?: string
    prompt?: string
    aspectRatio?: string
    quality?: string
  }>
}

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const params = await searchParams
  const generatePageKey = [
    params.mode ?? '',
    params.prompt ?? '',
    params.aspectRatio ?? '',
    params.quality ?? '',
  ].join('::')

  return <GeneratePageClient key={generatePageKey} />
}
