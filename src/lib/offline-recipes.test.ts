import { describe, expect, it } from 'vitest'
import {
  clearCachedRecipes,
  readCachedRecipe,
  readCachedRecipes,
  readLastCachedRecipes,
  writeCachedRecipes,
} from './offline-recipes'
import type { Doc, Id } from '../../convex/_generated/dataModel'

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

const recipeId = 'recipe-1' as Id<'recipes'>

function recipe(overrides: Partial<Doc<'recipes'>> = {}): Doc<'recipes'> {
  return {
    _id: recipeId,
    _creationTime: 1,
    householdId: 'household-1' as Id<'households'>,
    title: 'Bobotie',
    servings: 4,
    tags: ['mince'],
    ingredients: [{ name: 'mince', quantity: 500, unit: 'g' }],
    steps: ['Brown the mince.'],
    ...overrides,
  }
}

describe('the cached recipe book', () => {
  it('reads back what was written', () => {
    const storage = new MemoryStorage()
    writeCachedRecipes(storage, 'user-a', [recipe()])
    expect(readCachedRecipes(storage, 'user-a')?.[0]?.title).toBe('Bobotie')
  })

  it('knows nothing about a user it has not cached', () => {
    const storage = new MemoryStorage()
    writeCachedRecipes(storage, 'user-a', [recipe()])
    expect(readCachedRecipes(storage, 'user-b')).toBeUndefined()
  })

  it('survives a corrupted entry rather than throwing', () => {
    const storage = new MemoryStorage()
    storage.setItem('mealy:offline-recipes:v1:user-a:book', '{ not json')
    expect(readCachedRecipes(storage, 'user-a')).toBeUndefined()
  })

  it('finds a single recipe in the book', () => {
    const storage = new MemoryStorage()
    const other = 'recipe-2' as Id<'recipes'>
    writeCachedRecipes(storage, 'user-a', [
      recipe(),
      recipe({ _id: other, title: 'Bunny chow' }),
    ])
    expect(readCachedRecipe(storage, 'user-a', other)?.title).toBe('Bunny chow')
    expect(
      readCachedRecipe(storage, 'user-a', 'missing' as Id<'recipes'>),
    ).toBeUndefined()
  })

  it('replaces the book rather than merging into it', () => {
    const storage = new MemoryStorage()
    writeCachedRecipes(storage, 'user-a', [recipe()])
    writeCachedRecipes(storage, 'user-a', [])
    // A recipe deleted on another device must not come back from here.
    expect(readCachedRecipes(storage, 'user-a')).toEqual([])
  })
})

describe('readLastCachedRecipes', () => {
  it('finds nothing on a device that has cached nothing', () => {
    expect(readLastCachedRecipes(new MemoryStorage())).toBeUndefined()
  })

  it('returns the newest book and who it belongs to', () => {
    const storage = new MemoryStorage()
    writeCachedRecipes(storage, 'user-a', [recipe({ title: 'Older' })], 100)
    writeCachedRecipes(storage, 'user-b', [recipe({ title: 'Newer' })], 200)

    const found = readLastCachedRecipes(storage)
    expect(found?.userId).toBe('user-b')
    expect(found?.recipes[0]?.title).toBe('Newer')
  })
})

describe('clearCachedRecipes', () => {
  it('takes every book and leaves anything else alone', () => {
    const storage = new MemoryStorage()
    writeCachedRecipes(storage, 'user-a', [recipe()])
    writeCachedRecipes(storage, 'user-b', [recipe()])
    storage.setItem('unrelated', 'keep me')

    clearCachedRecipes(storage)

    expect(readCachedRecipes(storage, 'user-a')).toBeUndefined()
    expect(readCachedRecipes(storage, 'user-b')).toBeUndefined()
    expect(storage.getItem('unrelated')).toBe('keep me')
  })
})
