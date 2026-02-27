/**
 * Recency filter helpers — enforce MAX_HISTORY_DAYS across all collectors.
 */

/** Returns a Date representing `days` days ago from now. */
export function cutoffDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Returns true if `date` is older than `maxDays` ago (or null/undefined). */
export function isTooOld(date: Date | null | undefined, maxDays: number): boolean {
  if (!date) return false; // missing date → not too old (caller decides separately)
  return date < cutoffDate(maxDays);
}
