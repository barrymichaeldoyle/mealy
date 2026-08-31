import { stemKey } from './ingredient-names'
import type { Id } from '../../convex/_generated/dataModel'

/**
 * Which "these look like the same thing" prompts have been waved away.
 *
 * Kept on the device rather than in the database: it is a preference about a
 * suggestion, not a fact about the list, and a prompt that comes back on
 * every visit after you have said no is the fastest way to make people stop
 * reading prompts.
 */
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

const KEY = 'mealy:dismissed-merges:v1'

/** One group of spellings, identified by what they have in common. */
export function mergeKey(listId: Id<'shoppingLists'>, names: string[]): string {
  return `${listId}:${stemKey(names[0] ?? '')}`
}

function read(storage: StorageLike): string[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed)
      ? parsed.filter((k) => typeof k === 'string')
      : []
  } catch {
    return []
  }
}

export function isDismissed(storage: StorageLike, key: string): boolean {
  return read(storage).includes(key)
}

export function dismissMerge(storage: StorageLike, key: string): void {
  const keys = read(storage)
  if (keys.includes(key)) {
    return
  }
  try {
    storage.setItem(KEY, JSON.stringify([...keys, key]))
  } catch {
    // A full or blocked store only costs the prompt staying put.
  }
}
