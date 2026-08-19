import { describe, expect, test } from 'vitest'
import { defined } from '../optional'

describe('defined', () => {
  test('drops keys whose value is undefined', () => {
    expect(defined({ name: 'mince', quantity: undefined })).toEqual({
      name: 'mince',
    })
    expect('quantity' in defined({ name: 'mince', quantity: undefined })).toBe(
      false,
    )
  })

  test('keeps every other falsy value', () => {
    expect(defined({ a: 0, b: '', c: false, d: null })).toEqual({
      a: 0,
      b: '',
      c: false,
      d: null,
    })
  })

  test('leaves an object with no undefined values alone', () => {
    expect(defined({ name: 'flour', quantity: 200 })).toEqual({
      name: 'flour',
      quantity: 200,
    })
  })
})
