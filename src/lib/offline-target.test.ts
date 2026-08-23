import { describe, expect, it } from 'vitest'
import { writeCachedList } from './offline-lists'
import { writeCachedRecipes } from './offline-recipes'
import { resolveOfflineTarget } from './offline-target'
import type { CachedShoppingList } from './offline-lists'
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

const listId = 'list-1' as Id<'shoppingLists'>
const recipeId = 'recipe-1' as Id<'recipes'>

function recipe(overrides: Partial<Doc<'recipes'>> = {}): Doc<'recipes'> {
  return {
    _id: recipeId,
    _creationTime: 1,
    householdId: 'household-1' as Id<'households'>,
    title: 'Bobotie',
    servings: 4,
    tags: [],
    ingredients: [],
    steps: [],
    ...overrides,
  }
}

function list(): CachedShoppingList {
  return {
    _id: listId,
    _creationTime: 1,
    householdId: 'household-1' as Id<'households'>,
    name: 'Weekly shop',
    createdAt: 1,
    items: [],
  }
}

function seeded() {
  const storage = new MemoryStorage()
  writeCachedList(storage, 'user-a', list())
  writeCachedRecipes(storage, 'user-a', [recipe()])
  return storage
}

describe('resolveOfflineTarget', () => {
  it('opens the recipe the URL asked for', () => {
    const target = resolveOfflineTarget(seeded(), '/recipes/recipe-1')
    expect(target.kind).toBe('recipe')
    expect(target.kind === 'recipe' && target.recipe.title).toBe('Bobotie')
  })

  it('opens the list the URL asked for', () => {
    const target = resolveOfflineTarget(seeded(), '/lists/list-1')
    expect(target.kind).toBe('list')
    expect(target.kind === 'list' && target.list.name).toBe('Weekly shop')
    expect(target.kind === 'list' && target.userId).toBe('user-a')
  })

  it('opens the book for the recipes index', () => {
    expect(resolveOfflineTarget(seeded(), '/recipes').kind).toBe('book')
  })

  it('falls back to the list for anywhere else', () => {
    expect(resolveOfflineTarget(seeded(), '/plan').kind).toBe('list')
    expect(resolveOfflineTarget(seeded(), '/offline').kind).toBe('list')
  })

  it('falls back to the book when no list was ever cached', () => {
    const storage = new MemoryStorage()
    writeCachedRecipes(storage, 'user-a', [recipe()])
    expect(resolveOfflineTarget(storage, '/plan').kind).toBe('book')
  })

  it('offers the book when the recipe asked for is not cached', () => {
    // Still a recipes URL, so the book beats jumping to a shopping list.
    expect(resolveOfflineTarget(seeded(), '/recipes/missing').kind).toBe('book')
  })

  it('has nothing to offer on a device that cached nothing', () => {
    expect(resolveOfflineTarget(new MemoryStorage(), '/lists/x').kind).toBe(
      'none',
    )
  })

  it('does not mistake an empty book for a usable one', () => {
    const storage = new MemoryStorage()
    writeCachedRecipes(storage, 'user-a', [])
    expect(resolveOfflineTarget(storage, '/recipes').kind).toBe('none')
  })
})
