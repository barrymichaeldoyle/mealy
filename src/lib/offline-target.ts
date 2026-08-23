import { findCachedList, readLastCachedList } from './offline-lists'
import { findCachedRecipe, readLastCachedRecipes } from './offline-recipes'
import type { CachedShoppingList } from './offline-lists'
import type { Doc, Id } from '../../convex/_generated/dataModel'

export type OfflineTarget =
  | { kind: 'list'; userId: string; list: CachedShoppingList }
  | { kind: 'recipe'; recipe: Doc<'recipes'> }
  | { kind: 'book'; recipes: Doc<'recipes'>[] }
  | { kind: 'none' }

type StorageLike = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'
>

/**
 * What the offline page should show, from what was asked for and what this
 * device has kept.
 *
 * The service worker answers a failed navigation with the offline page's
 * contents but leaves the requested URL in the address bar, so the path
 * still says where the person was going. Tapping a recipe with no signal
 * should reach that recipe, not the shopping list.
 *
 * Anything unrecognised falls back to the list and then the book, in that
 * order, because the list is the thing people open with no signal on
 * purpose and the book is the thing they read with signal they lost.
 */
export function resolveOfflineTarget(
  storage: StorageLike,
  pathname: string,
): OfflineTarget {
  const recipe = /^\/recipes\/([^/]+)/.exec(pathname)
  if (recipe?.[1]) {
    const found = findCachedRecipe(storage, recipe[1] as Id<'recipes'>)
    if (found) {
      return { kind: 'recipe', recipe: found }
    }
  }

  const list = /^\/lists\/([^/]+)/.exec(pathname)
  if (list?.[1]) {
    const found = findCachedList(storage, list[1] as Id<'shoppingLists'>)
    if (found) {
      return { kind: 'list', userId: found.userId, list: found.list }
    }
  }

  if (pathname.startsWith('/recipes')) {
    const book = readLastCachedRecipes(storage)
    if (book && book.recipes.length > 0) {
      return { kind: 'book', recipes: book.recipes }
    }
  }

  const lastList = readLastCachedList(storage)
  if (lastList) {
    return { kind: 'list', userId: lastList.userId, list: lastList.list }
  }

  const book = readLastCachedRecipes(storage)
  if (book && book.recipes.length > 0) {
    return { kind: 'book', recipes: book.recipes }
  }
  return { kind: 'none' }
}
