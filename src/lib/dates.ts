/** ISO-date helpers for the weekly plan. Weeks start on Monday. */

export type IsoDate = string // "YYYY-MM-DD"

const DAY_MS = 24 * 60 * 60 * 1000

function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromIsoDate(iso: IsoDate): Date {
  // Indexing is unchecked, so a malformed string yields NaN parts and an
  // Invalid Date, which surfaces the problem instead of silently shifting it.
  const parts = iso.split('-')
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
}

function todayIso(): IsoDate {
  return toIsoDate(new Date())
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysSinceMonday = (result.getDay() + 6) % 7
  result.setDate(result.getDate() - daysSinceMonday)
  return result
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

/** Monday to Sunday. Typed as a 7-tuple so callers can index it safely. */
export type WeekDates = [
  IsoDate,
  IsoDate,
  IsoDate,
  IsoDate,
  IsoDate,
  IsoDate,
  IsoDate,
]

export function weekDates(weekStart: Date): WeekDates {
  return Array.from({ length: 7 }, (_, index) =>
    toIsoDate(addDays(weekStart, index)),
  ) as WeekDates
}

const WEEKDAY_LONG = new Intl.DateTimeFormat('en-ZA', { weekday: 'long' })
const DAY_MONTH = new Intl.DateTimeFormat('en-ZA', {
  day: 'numeric',
  month: 'short',
})

export function weekdayLongLabel(iso: IsoDate): string {
  return WEEKDAY_LONG.format(fromIsoDate(iso))
}

export function dayMonthLabel(iso: IsoDate): string {
  return DAY_MONTH.format(fromIsoDate(iso))
}

/** "18-24 Aug" style label for the week header. */
export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  return `${DAY_MONTH.format(weekStart)}-${DAY_MONTH.format(end)}`
}

export function isToday(iso: IsoDate): boolean {
  return iso === todayIso()
}
