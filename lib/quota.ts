import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuotaInfo } from '@/lib/types'

export async function checkQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<QuotaInfo> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('daily_quota, monthly_quota')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error('Failed to fetch user profile')
  }

  const dailyLimit: number = profile.daily_quota ?? 10
  const monthlyLimit: number = profile.monthly_quota ?? 200

  const now = new Date()
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString()
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString()

  const [dailyResult, monthlyResult] = await Promise.all([
    supabase
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDay),
    supabase
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth),
  ])

  if (dailyResult.error) {
    throw new Error(`Failed to fetch daily usage: ${dailyResult.error.message}`)
  }
  if (monthlyResult.error) {
    throw new Error(`Failed to fetch monthly usage: ${monthlyResult.error.message}`)
  }

  const dailyUsed = dailyResult.count ?? 0
  const monthlyUsed = monthlyResult.count ?? 0

  return {
    allowed: dailyUsed < dailyLimit && monthlyUsed < monthlyLimit,
    dailyUsed,
    dailyLimit,
    monthlyUsed,
    monthlyLimit,
  }
}

export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  action: 'generate' | 'edit'
): Promise<void> {
  const { error } = await supabase.from('usage_logs').insert({
    user_id: userId,
    action,
  })

  if (error) {
    throw new Error(`Failed to record usage: ${error.message}`)
  }
}
