import { normalizeName } from './units'

/**
 * The aisles a new household starts with, in the order most shops are laid
 * out: fresh things at the front, cupboard things in the middle, the
 * non-food aisles at the back. Nobody has to keep these. They exist so the
 * first list groups itself instead of opening on a settings screen.
 */
export const DEFAULT_CATEGORIES = [
  'Fruit & veg',
  'Bakery',
  'Meat & fish',
  'Dairy',
  'Frozen',
  'Tinned & dry',
  'Snacks & drinks',
  'Household',
  'Toiletries',
] as const

/** A store, written structurally so this module stays free of Convex. */
export type StoreLike = {
  _id: string
  name: string
  sortOrder: number
}

/** What the catalogue knows about one thing the household buys. */
export type CatalogueEntry = {
  key: string
  storeIds: string[]
  categoryId?: string | undefined
}

/**
 * Which store an item goes to when more than one sells it.
 *
 * Milk is at both shops, and a shopping list has to pick one, so it picks
 * the shop the household ranked higher. The rest are still recorded, which
 * is what lets the row say "also at Checkers" and what makes moving it a
 * tap rather than a retype.
 */
export function preferredStore(
  storeIds: string[],
  stores: StoreLike[],
): string | null {
  const ranked = stores
    .filter((store) => storeIds.includes(store._id))
    .toSorted(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    )
  return ranked[0]?._id ?? null
}

/**
 * A catalogue keyed the way lookups arrive: by normalised name. Built once
 * per mutation rather than queried per item, since a week's shop asks the
 * same question thirty times.
 */
export function catalogueIndex(
  entries: CatalogueEntry[],
): Map<string, CatalogueEntry> {
  return new Map(entries.map((entry) => [entry.key, entry]))
}

export type RoutableItem = { name: string }

/**
 * Split items into one bucket per store, using what the catalogue knows.
 *
 * Anything the household has never filed lands in the `null` bucket. That is
 * not a failure state: it is the list you shop from until you tell it where
 * the thing comes from, and it is the only bucket a brand new household has.
 */
export function routeByStore<T extends RoutableItem>(
  items: T[],
  catalogue: Map<string, CatalogueEntry>,
  stores: StoreLike[],
): Map<string | null, T[]> {
  const buckets = new Map<string | null, T[]>()

  for (const item of items) {
    const entry = catalogue.get(normalizeName(item.name))
    const storeId = entry ? preferredStore(entry.storeIds, stores) : null
    const bucket = buckets.get(storeId)
    if (bucket) {
      bucket.push(item)
    } else {
      buckets.set(storeId, [item])
    }
  }

  return buckets
}

/**
 * Bucket order for the lists a shop produces: the stores in the order you
 * walk them, and the unfiled pile last, since it is the one you deal with
 * when the rest is done.
 */
export function bucketOrder(
  storeIds: (string | null)[],
  stores: StoreLike[],
): (string | null)[] {
  const rank = new Map(stores.map((store) => [store._id, store.sortOrder]))
  return storeIds.toSorted((a, b) => {
    if (a === null) {
      return 1
    }
    if (b === null) {
      return -1
    }
    return (rank.get(a) ?? 0) - (rank.get(b) ?? 0)
  })
}

export type CategoryLike = { _id: string; name: string; sortOrder: number }
export type CategorisedItem = { categoryId?: string | undefined }

export type CategorySection<T> = {
  /** Null for the section holding everything not filed yet. */
  categoryId: string | null
  name: string
  items: T[]
}

/**
 * Group a list into the sections you shop it in. Empty categories are left
 * out: a list is a thing you read in an aisle, not a report on the
 * household's category list.
 */
export function groupByCategory<T extends CategorisedItem>(
  items: T[],
  categories: CategoryLike[],
  unfiledLabel = 'Everything else',
): CategorySection<T>[] {
  const ordered = categories.toSorted(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  )

  const sections: CategorySection<T>[] = ordered.map((category) => ({
    categoryId: category._id,
    name: category.name,
    items: [],
  }))
  const byId = new Map(sections.map((section) => [section.categoryId, section]))

  const unfiled: CategorySection<T> = {
    categoryId: null,
    name: unfiledLabel,
    items: [],
  }

  for (const item of items) {
    const section = item.categoryId ? byId.get(item.categoryId) : undefined
    // A category deleted while a list still points at it reads as unfiled
    // rather than as a section with no name.
    ;(section ?? unfiled).items.push(item)
  }

  return [...sections, unfiled].filter((section) => section.items.length > 0)
}

/**
 * Next free slot at the bottom of a sorted list, leaving gaps so a later
 * reorder can drop something between two rows without rewriting them all.
 */
export function nextSortOrder(existing: { sortOrder: number }[]): number {
  return existing.reduce((max, row) => Math.max(max, row.sortOrder), -10) + 10
}
