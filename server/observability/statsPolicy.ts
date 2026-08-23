export function shouldRecordGlobalStats(userId?: string): boolean {
  return typeof userId === 'string' && userId.length > 0;
}