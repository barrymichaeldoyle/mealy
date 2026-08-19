import { describe, expect, it } from 'vitest'
import {
  dayOfMonth,
  isCurrentWeek,
  startOfWeek,
  weekRangeLabel,
  weekdayShortLabel,
} from './dates'

describe('weekRangeLabel', () => {
  it('names the month once when the week sits inside it', () => {
    expect(weekRangeLabel(new Date(2026, 7, 17))).toBe('17-23 Aug')
  })

  it('spells both months out when the week straddles two', () => {
    expect(weekRangeLabel(new Date(2026, 7, 31))).toBe('31 Aug-6 Sep')
  })

  it('handles a week that crosses a year boundary', () => {
    expect(weekRangeLabel(new Date(2026, 11, 28))).toBe('28 Dec-3 Jan')
  })
})

describe('the plan rail', () => {
  it('reads a weekday and a date number off an ISO date', () => {
    expect(weekdayShortLabel('2026-08-17')).toBe('Mon')
    expect(dayOfMonth('2026-08-17')).toBe(17)
  })
})

describe('isCurrentWeek', () => {
  it('is true for the Monday of the week we are in', () => {
    expect(isCurrentWeek(startOfWeek(new Date()))).toBe(true)
  })

  it('is false once you page away', () => {
    const nextWeek = startOfWeek(new Date())
    nextWeek.setDate(nextWeek.getDate() + 7)
    expect(isCurrentWeek(nextWeek)).toBe(false)
  })
})
