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
