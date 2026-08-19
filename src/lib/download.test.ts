import { describe, expect, test } from 'vitest'
import { exportFilename } from './download'

describe('exportFilename', () => {
  test('names the file after the day it was made', () => {
    expect(exportFilename(new Date('2026-08-19T17:45:00Z'))).toBe(
      'mealy-2026-08-19.json',
    )
  })

  test('uses UTC, so a late evening download does not jump a day', () => {
    expect(exportFilename(new Date('2026-08-19T23:59:59Z'))).toBe(
      'mealy-2026-08-19.json',
    )
  })
})
