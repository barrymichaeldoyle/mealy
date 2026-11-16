import { describe, expect, test } from 'vitest'
import { compareListItems, moveBy } from '../lists'

const names = (items: { name: string }[]) => items.map((item) => item.name)

describe('compareListItems', () => {
  test('an untouched list reads alphabetically', () => {
    const items = [{ name: 'Milk' }, { name: 'Bread' }, { name: 'Eggs' }]
    expect(names(items.toSorted(compareListItems))).toEqual([
      'Bread',
      'Eggs',
      'Milk',
    ])
  })

  test('placed rows follow their order, not the alphabet', () => {
    const items = [
      { name: 'Bread', sortOrder: 20 },
      { name: 'Milk', sortOrder: 0 },
      { name: 'Eggs', sortOrder: 10 },
    ]
    expect(names(items.toSorted(compareListItems))).toEqual([
      'Milk',
      'Eggs',
      'Bread',
    ])
  })

  test('a row added after a reorder goes to the bottom', () => {
    const items = [
      { name: 'Apples' },
      { name: 'Milk', sortOrder: 0 },
      { name: 'Bread', sortOrder: 10 },
      { name: 'Zucchini' },
    ]
    expect(names(items.toSorted(compareListItems))).toEqual([
      'Milk',
      'Bread',
      'Apples',
      'Zucchini',
    ])
  })

  test('a tie on position breaks on the name', () => {
    const items = [
      { name: 'Milk', sortOrder: 0 },
      { name: 'Butter', sortOrder: 0 },
    ]
    expect(names(items.toSorted(compareListItems))).toEqual(['Butter', 'Milk'])
  })
})

describe('moveBy', () => {
  test('swaps a row with the one above', () => {
    expect(moveBy(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
  })

  test('swaps a row with the one below', () => {
    expect(moveBy(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  test('refuses to move past either end', () => {
    expect(moveBy(['a', 'b'], 0, -1)).toBeNull()
    expect(moveBy(['a', 'b'], 1, 1)).toBeNull()
  })

  test('leaves the original alone', () => {
    const ids = ['a', 'b']
    moveBy(ids, 0, 1)
    expect(ids).toEqual(['a', 'b'])
  })
})
