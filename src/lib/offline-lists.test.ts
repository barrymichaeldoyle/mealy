import { describe, expect, it } from 'vitest'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import {
  clearCachedLists,
  queueToggle,
  readLastCachedList,
  readCachedList,
  readPendingToggles,
  removePendingToggle,
  toggleCachedItem,
  writeCachedList,
  type CachedShoppingList,
} from './offline-lists'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

const listId = 'list-1' as Id<'shoppingLists'>
const itemId = 'item-1' as Id<'shoppingListItems'>

function cachedList(): CachedShoppingList {
  const item: Doc<'shoppingListItems'> = {
    _id: itemId,
    _creationTime: 1,
    householdId: 'household-1' as Id<'households'>,
    listId,
    name: 'Milk',
    unit: 'l',
    quantity: 1,
    checked: false,
    manuallyAdded: true,
    approximate: false,
    sourceRecipeIds: [],
  }
  return {
    _id: listId,
    _creationTime: 1,
    householdId: item.householdId,
    name: 'Shop',
    createdAt: 1,
    items: [item],
  }
}

describe('offline shopping lists', () => {
  it('keeps cached lists separate for each user', () => {
    const storage = new MemoryStorage()
    writeCachedList(storage, 'user-a', cachedList())

    expect(readCachedList(storage, 'user-a', listId)?.name).toBe('Shop')
    expect(readCachedList(storage, 'user-b', listId)).toBeUndefined()
  })

  it('updates a cached check-off', () => {
    const storage = new MemoryStorage()
    writeCachedList(storage, 'user-a', cachedList())

    expect(toggleCachedItem(storage, 'user-a', itemId, true)).toBe(true)
    expect(readCachedList(storage, 'user-a', listId)?.items[0]?.checked).toBe(
      true,
    )
  })

  it('collapses repeated check-offs to the latest value', () => {
    const storage = new MemoryStorage()
    queueToggle(storage, 'user-a', { id: itemId, checked: true })
    queueToggle(storage, 'user-a', { id: itemId, checked: false })

    expect(readPendingToggles(storage, 'user-a')).toEqual([
      { id: itemId, checked: false },
    ])

    removePendingToggle(storage, 'user-a', itemId)
    expect(readPendingToggles(storage, 'user-a')).toEqual([])
  })
})

describe('readLastCachedList', () => {
  it('finds nothing on a device that has cached nothing', () => {
    expect(readLastCachedList(new MemoryStorage())).toBeUndefined()
  })

  it('returns the most recently cached list and who it belongs to', () => {
    const storage = new MemoryStorage()
    writeCachedList(storage, 'user-a', { ...cachedList(), name: 'Older' }, 100)
    writeCachedList(
      storage,
      'user-a',
      { ...cachedList(), _id: 'list-2' as Id<'shoppingLists'>, name: 'Newer' },
      200,
    )

    const found = readLastCachedList(storage)
    expect(found?.userId).toBe('user-a')
    expect(found?.list.name).toBe('Newer')
  })

  it('reads a list written before cachedAt existed', () => {
    const storage = new MemoryStorage()
    // A copy from the previous version carries no timestamp.
    storage.setItem(
      `mealy:offline-lists:v1:user-a:list:${listId}`,
      JSON.stringify(cachedList()),
    )
    expect(readLastCachedList(storage)?.list.name).toBe('Shop')
  })

  it('ignores the pending toggles stored beside the lists', () => {
    const storage = new MemoryStorage()
    queueToggle(storage, 'user-a', { id: itemId, checked: true })
    expect(readLastCachedList(storage)).toBeUndefined()
  })
})

describe('clearCachedLists', () => {
  it('takes every list and queue, and leaves anything else alone', () => {
    const storage = new MemoryStorage()
    writeCachedList(storage, 'user-a', cachedList())
    queueToggle(storage, 'user-a', { id: itemId, checked: true })
    storage.setItem('unrelated', 'keep me')

    clearCachedLists(storage)

    expect(readLastCachedList(storage)).toBeUndefined()
    expect(readPendingToggles(storage, 'user-a')).toEqual([])
    expect(storage.getItem('unrelated')).toBe('keep me')
  })
})
