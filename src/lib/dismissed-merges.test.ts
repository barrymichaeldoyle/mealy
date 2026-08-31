import { describe, expect, it } from 'vitest'
import { dismissMerge, isDismissed, mergeKey } from './dismissed-merges'
import type { Id } from '../../convex/_generated/dataModel'

const LIST = 'list_1' as Id<'shoppingLists'>

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  }
}

describe('dismissed merges', () => {
  it('remembers a prompt that was waved away', () => {
    const store = storage()
    const key = mergeKey(LIST, ['Roast Veg Pack', 'Roasted Veg Pack'])
    expect(isDismissed(store, key)).toBe(false)
    dismissMerge(store, key)
    expect(isDismissed(store, key)).toBe(true)
  })

  it('keys on the spellings, so the same pair on another list still asks', () => {
    const store = storage()
    dismissMerge(store, mergeKey(LIST, ['onion', 'onions']))
    const other = 'list_2' as Id<'shoppingLists'>
    expect(isDismissed(store, mergeKey(other, ['onion', 'onions']))).toBe(false)
  })

  it('survives a corrupt store', () => {
    const store = storage()
    store.setItem('mealy:dismissed-merges:v1', 'not json')
    expect(isDismissed(store, 'anything')).toBe(false)
    dismissMerge(store, 'anything')
    expect(isDismissed(store, 'anything')).toBe(true)
  })
})
