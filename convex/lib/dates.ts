/**
 * Date helpers for names generated on the server. The client has its own
 * formatter in src/lib/dates.ts; this one exists so a stored list name reads
 * the same way the plan header does, without pulling Intl into a mutation.
 */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** "2026-08-17" becomes "17 Aug". Falls back to the input if it is not a date. */
export function formatShortDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return iso
  const month = MONTHS[Number(match[2]) - 1]
  if (!month) return iso
  return `${Number(match[3])} ${month}`
}
