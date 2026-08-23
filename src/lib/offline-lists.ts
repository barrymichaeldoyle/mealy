import type { Doc, Id } from '../../convex/_generated/dataModel'

export type CachedShoppingList = Doc<'shoppingLists'> & {
  items: Doc<'shoppingListItems'>[]
  /** When this copy was taken, so "your last list" means something. */
  cachedAt?: number
}

export type PendingToggle = {
  id: Id<'shoppingListItems'>
  checked: boolean
}

type StorageLike = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'
>

const PREFIX = 'mealy:offline-lists:v1'

function listKey(userId: string, listId: Id<'shoppingLists'>): string {
  return `${PREFIX}:${userId}:list:${listId}`
}

function togglesKey(userId: string): string {
  return `${PREFIX}:${userId}:toggles`
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

export function readCachedList(
  storage: StorageLike,
  userId: string,
  listId: Id<'shoppingLists'>,
): CachedShoppingList | undefined {
  return parse<CachedShoppingList>(storage.getItem(listKey(userId, listId)))
}

export function writeCachedList(
  storage: StorageLike,
  userId: string,
  list: CachedShoppingList,
  now: number = Date.now(),
): void {
  storage.setItem(
    listKey(userId, list._id),
    JSON.stringify({ ...list, cachedAt: now }),
  )
}

/**
 * The most recently cached list, whoever it belongs to.
 *
 * The offline page has no Clerk session to ask who is signed in, so the
 * owner comes back with the list and the caller uses it to queue ticks
 * under the right key. A phone that has only ever had one person signed in
 * has one owner here, which is the case this exists for: standing in a shop
 * with no signal and a locked phone that dropped the tab.
 */
export function readLastCachedList(
  storage: StorageLike,
): { userId: string; list: CachedShoppingList } | undefined {
  let best: { userId: string; list: CachedShoppingList } | undefined
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key?.startsWith(`${PREFIX}:`) || !key.includes(':list:')) {
      continue
    }
    const list = parse<CachedShoppingList>(storage.getItem(key))
    if (!list) {
      continue
    }
    const userId = key.slice(PREFIX.length + 1, key.indexOf(':list:'))
    if (!best || (list.cachedAt ?? 0) > (best.list.cachedAt ?? 0)) {
      best = { userId, list }
    }
  }
  return best
}

/**
 * A single list, whoever it belongs to, for when the offline page knows
 * which one was asked for.
 */
export function findCachedList(
  storage: StorageLike,
  listId: Id<'shoppingLists'>,
): { userId: string; list: CachedShoppingList } | undefined {
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key?.startsWith(`${PREFIX}:`) || !key.endsWith(`:list:${listId}`)) {
      continue
    }
    const list = parse<CachedShoppingList>(storage.getItem(key))
    if (list) {
      return {
        userId: key.slice(PREFIX.length + 1, key.indexOf(':list:')),
        list,
      }
    }
  }
  return undefined
}

/** Everything this device has cached for anyone. Used when signing out. */
export function clearCachedLists(storage: StorageLike): void {
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

export function readPendingToggles(
  storage: StorageLike,
  userId: string,
): PendingToggle[] {
  return parse<PendingToggle[]>(storage.getItem(togglesKey(userId))) ?? []
}

export function queueToggle(
  storage: StorageLike,
  userId: string,
  toggle: PendingToggle,
): void {
  const pending = readPendingToggles(storage, userId).filter(
    ({ id }) => id !== toggle.id,
  )
  storage.setItem(togglesKey(userId), JSON.stringify([...pending, toggle]))
}

export function removePendingToggle(
  storage: StorageLike,
  userId: string,
  itemId: Id<'shoppingListItems'>,
): void {
  const pending = readPendingToggles(storage, userId).filter(
    ({ id }) => id !== itemId,
  )
  if (pending.length === 0) {
    storage.removeItem(togglesKey(userId))
    return
  }
  storage.setItem(togglesKey(userId), JSON.stringify(pending))
}

export function toggleCachedItem(
  storage: StorageLike,
  userId: string,
  itemId: Id<'shoppingListItems'>,
  checked: boolean,
): boolean {
  const suffix = `:${userId}:list:`
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key?.startsWith(`${PREFIX}${suffix}`)) {
      continue
    }
    const list = parse<CachedShoppingList>(storage.getItem(key))
    if (!list?.items.some((item) => item._id === itemId)) {
      continue
    }
    writeCachedList(storage, userId, {
      ...list,
      items: list.items.map((item) =>
        item._id === itemId ? { ...item, checked } : item,
      ),
    })
    return true
  }
  return false
}
