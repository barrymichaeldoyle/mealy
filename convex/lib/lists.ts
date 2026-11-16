import type { ConsolidationInput, Unit } from './units'

/**
 * The shape `ingredientInputs` needs, written structurally so this module
 * stays free of Convex imports and the client can call it too.
 */
export type RecipeForList = {
  _id: string
  servings: number
  ingredients: {
    name: string
    quantity?: number | undefined
    unit: Unit
    note?: string | undefined
  }[]
}

/**
 * One recipe's ingredients, scaled to the servings being cooked, ready for
 * `consolidate`.
 *
 * Shared so the preview a person sees before generating a list is the same
 * arithmetic that builds it, rather than a second implementation that can
 * drift from the first.
 */
export function ingredientInputs(
  recipe: RecipeForList,
  servings: number,
): ConsolidationInput[] {
  const scale = recipe.servings > 0 ? servings / recipe.servings : 1
  return recipe.ingredients.map((ingredient) => ({
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    note: ingredient.note,
    scale,
    recipeId: recipe._id,
  }))
}

/** The fields `compareListItems` reads, written structurally like above. */
export type OrderableItem = {
  name: string
  sortOrder?: number | undefined
}

/**
 * The order rows sit in on a list. Rows someone has placed come first, in
 * the order they were placed. The rest follow alphabetically, which is how
 * every list reads until somebody moves something, and which puts an item
 * added after a reorder at the bottom rather than wedged into the middle.
 */
export function compareListItems(a: OrderableItem, b: OrderableItem): number {
  if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
    return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  }
  if (a.sortOrder !== undefined) {
    return -1
  }
  if (b.sortOrder !== undefined) {
    return 1
  }
  return a.name.localeCompare(b.name)
}

/**
 * `ids` with the one at `index` swapped with its neighbour `by` places away,
 * or null when that neighbour does not exist. A copy, never the original.
 */
export function moveBy<T>(ids: readonly T[], index: number, by: number) {
  const target = index + by
  const moved = ids[index]
  const displaced = ids[target]
  if (moved === undefined || displaced === undefined) {
    return null
  }
  const next = [...ids]
  next[index] = displaced
  next[target] = moved
  return next
}
