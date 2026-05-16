export function todayLocalISO(now: Date = new Date()): string {
  // 'sv-SE' (Swedish) locale renders dates as YYYY-MM-DD natively,
  // and toLocaleDateString uses the system local time zone.
  return now.toLocaleDateString('sv-SE')
}
