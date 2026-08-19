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

/**
 * Three-letter month for a 0-based index, or undefined if out of range.
 * `src/lib/dates.ts` formats against this too, because en-ZA's Intl data
 * abbreviates September as "Sept" and the two would otherwise disagree.
 */
export function shortMonth(index: number): string | undefined {
  return MONTHS[index]
}

/** "2026-08-17" becomes "17 Aug". Falls back to the input if it is not a date. */
export function formatShortDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) {
    return iso
  }
  const month = MONTHS[Number(match[2]) - 1]
  if (!month) {
    return iso
  }
  return `${Number(match[3])} ${month}`
}
