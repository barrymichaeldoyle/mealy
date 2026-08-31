/**
 * Ingredient names are typed by hand, by two people, weeks apart. "Roast Veg
 * Pack" and "Roasted Veg Pack" are the same thing to a shopper and two
 * different lines to `consolidate`, which merges on the exact name.
 *
 * Everything here suggests. Nothing here merges on its own: a stem match is
 * a good hint and a bad decision, and a wrong merge is only discovered in
 * the shop, in front of a shelf, with the evidence gone.
 */
import { normalizeName } from '../../convex/lib/units'

/**
 * A crude singular, present-tense form of one word. Not linguistics: both
 * sides of a comparison go through it, so it only has to be consistent.
 * "roasted" and "roast" land on the same stem, which is the whole job.
 */
function stemWord(word: string): string {
  let stem = word
  if (stem.length > 4 && stem.endsWith('ies')) {
    return `${stem.slice(0, -3)}y`
  }
  if (stem.length > 3 && stem.endsWith('es')) {
    stem = stem.slice(0, -2)
  } else if (stem.length > 3 && stem.endsWith('s')) {
    stem = stem.slice(0, -1)
  }
  if (stem.length > 4 && stem.endsWith('ed')) {
    stem = stem.slice(0, -2)
  }
  return stem
}

/**
 * What two names share when they are the same ingredient said differently.
 * Word order is dropped, so "chicken stock" and "stock chicken" match, and
 * the word count is not, so "cream" never matches "creamed corn".
 */
export function stemKey(name: string): string {
  return normalizeName(name)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(stemWord)
    .toSorted()
    .join(' ')
}

/** Same thing, spelled differently. Identical names are not "similar". */
export function looksLikeSameThing(a: string, b: string): boolean {
  if (normalizeName(a) === normalizeName(b)) {
    return false
  }
  const key = stemKey(a)
  return key.length > 0 && key === stemKey(b)
}

export type NameCount = { name: string; count: number }

type RecipeLike = { ingredients: { name: string }[] }

/**
 * Every ingredient name the household has typed, most used first. The spelling
 * kept is the one used most, since that is the one the next suggestion should
 * offer.
 */
export function ingredientVocabulary(recipes: RecipeLike[]): NameCount[] {
  const counts = new Map<string, Map<string, number>>()

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const name = ingredient.name.trim()
      if (!name) {
        continue
      }
      const key = normalizeName(name)
      const spellings = counts.get(key) ?? new Map<string, number>()
      spellings.set(name, (spellings.get(name) ?? 0) + 1)
      counts.set(key, spellings)
    }
  }

  const vocabulary: NameCount[] = []
  for (const spellings of counts.values()) {
    let total = 0
    let best = ''
    let bestCount = 0
    for (const [name, count] of spellings) {
      total += count
      if (count > bestCount) {
        best = name
        bestCount = count
      }
    }
    vocabulary.push({ name: best, count: total })
  }

  return vocabulary.toSorted(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  )
}

/**
 * Names worth offering for what has been typed so far. A name that is the
 * same thing said differently comes first: that is the one that stops the
 * split, and it is the one a prefix search would never surface.
 */
export function suggestNames(
  vocabulary: NameCount[],
  typed: string,
  limit = 4,
): string[] {
  const term = normalizeName(typed)
  if (!term) {
    return []
  }

  const scored: { name: string; rank: number; count: number }[] = []
  for (const entry of vocabulary) {
    const name = normalizeName(entry.name)
    if (name === term) {
      // Already exactly what they typed. Nothing to suggest.
      return []
    }
    const rank = looksLikeSameThing(entry.name, typed)
      ? 0
      : name.startsWith(term)
        ? 1
        : name.includes(term)
          ? 2
          : -1
    if (rank >= 0) {
      scored.push({ name: entry.name, rank, count: entry.count })
    }
  }

  return scored
    .toSorted(
      (a, b) =>
        a.rank - b.rank || b.count - a.count || a.name.localeCompare(b.name),
    )
    .slice(0, limit)
    .map((entry) => entry.name)
}

/**
 * Rows that look like one ingredient split in two, grouped so the list can
 * offer the merge. Only groups with more than one spelling come back.
 */
export function similarNameGroups<T extends { name: string }>(
  items: T[],
): T[][] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = stemKey(item.name)
    if (!key) {
      continue
    }
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return [...groups.values()].filter(
    (group) => new Set(group.map((item) => normalizeName(item.name))).size > 1,
  )
}
