/** ISO-date helpers for the weekly plan. Weeks start on Monday. */

import { shortMonth } from '../../convex/lib/dates'

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
const WEEKDAY_SHORT = new Intl.DateTimeFormat('en-ZA', { weekday: 'short' })
/*
 * en-ZA zero-pads a numeric day ("03 Jan"), which reads like a filename, so
 * the day is written by hand. The month comes from the same table the
 * server names lists with, so a stored name and this label always agree.
 */
function dayMonth(date: Date): string {
  return `${date.getDate()} ${shortMonth(date.getMonth()) ?? ''}`.trim()
}

export function weekdayLongLabel(iso: IsoDate): string {
  return WEEKDAY_LONG.format(fromIsoDate(iso))
}

/** "Mon". The plan rail upper-cases it in CSS. */
export function weekdayShortLabel(iso: IsoDate): string {
  return WEEKDAY_SHORT.format(fromIsoDate(iso))
}

/** The date number alone, for the plan's left rail. */
export function dayOfMonth(iso: IsoDate): number {
  return fromIsoDate(iso).getDate()
}

/**
 * "17-23 Aug" for the week header, naming the month once when both ends
 * share it. A week that straddles two months spells both out.
 */
export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()}-${end.getDate()} ${shortMonth(end.getMonth()) ?? ''}`.trim()
  }
  return `${dayMonth(weekStart)}-${dayMonth(end)}`
}

/** "3 Jan" for a timestamp, e.g. the date a shopping list was made. */
export function shortDateLabel(timestamp: number): string {
  return dayMonth(new Date(timestamp))
}

/** True when `weekStart` is the Monday of the week we are in right now. */
export function isCurrentWeek(weekStart: Date): boolean {
  return toIsoDate(weekStart) === toIsoDate(startOfWeek(new Date()))
}

export function isToday(iso: IsoDate): boolean {
  return iso === todayIso()
}
