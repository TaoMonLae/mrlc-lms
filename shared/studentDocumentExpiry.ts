import { dailyQuestDayKey } from './dailyQuest';

export function studentDocumentExpiryStatus(expiryDate?: string | null, now = new Date()): 'EXPIRED' | 'EXPIRING_SOON' | null {
  if (!expiryDate || Number.isNaN(new Date(expiryDate).getTime())) return null;
  const key = expiryDate.slice(0, 10);
  const today = dailyQuestDayKey(now);
  if (key < today) return 'EXPIRED';
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 30);
  return key <= limit.toISOString().slice(0, 10) ? 'EXPIRING_SOON' : null;
}
