import type { Doc, Id } from '../../convex/_generated/dataModel'

/**
 * The recipe book, kept on the device so it can be read without a
 * connection. A kitchen is a room with thick walls and a phone on the
 * counter, and the recipe is the thing you are reading when the signal
 * goes.
 *
 * Read only. Writing a recipe needs the server, so nothing is queued here
 * the way shopping list ticks are: there is no half-written recipe to
 * reconcile later.
 *
 * `recipes.list` returns whole documents, so one cached book answers both
 * the index and any single recipe. There is no per-recipe key.
 */
type CachedRecipeBook = {
  recipes: Doc<'recipes'>[]
  /** When this copy was taken, so "your last book" means something. */
  cachedAt: number
}

type StorageLike = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'
>

const PREFIX = 'mealy:offline-recipes:v1'

function bookKey(userId: string): string {
  return `${PREFIX}:${userId}:book`
}

function parse<T>(value: string | null): T | undefined {
  if (!value) {
    return undefined
  }
  try {
    return JSON.parse(value) as T
  } catch {
    return undefined
  }
}

export function readCachedRecipes(
  storage: StorageLike,
  userId: string,
): Doc<'recipes'>[] | undefined {
  return parse<CachedRecipeBook>(storage.getItem(bookKey(userId)))?.recipes
}

export function writeCachedRecipes(
  storage: StorageLike,
  userId: string,
  recipes: Doc<'recipes'>[],
  now: number = Date.now(),
): void {
  storage.setItem(
    bookKey(userId),
    JSON.stringify({ recipes, cachedAt: now } satisfies CachedRecipeBook),
  )
}

export function readCachedRecipe(
  storage: StorageLike,
  userId: string,
  id: Id<'recipes'>,
): Doc<'recipes'> | undefined {
  return readCachedRecipes(storage, userId)?.find((recipe) => recipe._id === id)
}

/**
 * The most recently cached book, and who it belongs to. The offline page
 * has no Clerk session to ask, so the owner comes back with the book.
 */
export function readLastCachedRecipes(
  storage: StorageLike,
): { userId: string; recipes: Doc<'recipes'>[] } | undefined {
  let best: { userId: string; book: CachedRecipeBook } | undefined
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key?.startsWith(`${PREFIX}:`) || !key.endsWith(':book')) {
      continue
    }
    const book = parse<CachedRecipeBook>(storage.getItem(key))
    if (!book) {
      continue
    }
    const userId = key.slice(PREFIX.length + 1, key.length - ':book'.length)
    if (!best || book.cachedAt > best.book.cachedAt) {
      best = { userId, book }
    }
  }
  return best ? { userId: best.userId, recipes: best.book.recipes } : undefined
}

/**
 * A single recipe, whoever it belongs to. The offline page knows which
 * recipe was asked for, from the URL the failed navigation left behind,
 * but not who is signed in.
 */
export function findCachedRecipe(
  storage: StorageLike,
  id: Id<'recipes'>,
): Doc<'recipes'> | undefined {
  return readLastCachedRecipes(storage)?.recipes.find(
    (recipe) => recipe._id === id,
  )
}

/** Everything this device has cached for anyone. Used when signing out. */
export function clearCachedRecipes(storage: StorageLike): void {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key?.startsWith(`${PREFIX}:`)) {
      keys.push(key)
    }
  }
  for (const key of keys) {
    storage.removeItem(key)
  }
}
