import type { QuotaInfo } from '@/lib/types'
import { getQuotaInfo, recordUsage as dbRecordUsage } from '@/lib/db/queries'

export async function checkQuota(userId: string): Promise<QuotaInfo> {
  const quota = await getQuotaInfo(userId)

  return {
    allowed: quota.allowed,
    dailyUsed: quota.dailyUsed,
    dailyLimit: quota.dailyLimit,
    monthlyUsed: quota.monthlyUsed,
    monthlyLimit: quota.monthlyLimit,
  }
}

export async function recordUsage(
  userId: string,
  action: 'generate' | 'edit'
): Promise<void> {
  await dbRecordUsage(userId, action)
}
