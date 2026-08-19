import { ConvexError } from 'convex/values'
import type { Unit } from './units'
import { defined, type Defined } from './optional'

export type IngredientInput = {
  name: string
  quantity?: number | undefined
  unit: Unit
  note?: string | undefined
}

export type RecipeInput = {
  title: string
  description?: string | undefined
  servings: number
  prepTimeMinutes?: number | undefined
  cookTimeMinutes?: number | undefined
  tags: string[]
  ingredients: IngredientInput[]
  steps: string[]
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new ConvexError(message)
  }
}

function positiveInt(value: number | undefined, label: string): void {
  if (value === undefined) {
    return
  }
  assert(Number.isFinite(value), `${label} must be a number`)
  assert(value >= 0, `${label} cannot be negative`)
}

/**
 * Server-side mirror of the client form rules. The client validates for fast
 * feedback; this is what actually protects the data.
 */
/**
 * Normalised and checked. Optional fields come back absent rather than set to
 * undefined, which is what Convex writes to the database.
 */
export type ValidatedRecipe = Defined<
  Omit<RecipeInput, 'ingredients'> & {
    ingredients: Defined<IngredientInput>[]
  }
>

export function validateRecipe(input: RecipeInput): ValidatedRecipe {
  const title = input.title.trim()
  assert(title.length > 0, 'Title is required')
  assert(title.length <= 120, 'Title is too long')

  assert(Number.isFinite(input.servings), 'Servings must be a number')
  assert(
    input.servings >= 1 && input.servings <= 100,
    'Servings must be 1 to 100',
  )

  positiveInt(input.prepTimeMinutes, 'Prep time')
  positiveInt(input.cookTimeMinutes, 'Cook time')

  const ingredients = input.ingredients
    .map((ingredient) =>
      defined({
        name: ingredient.name.trim(),
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        note: ingredient.note?.trim() || undefined,
      }),
    )
    .filter((ingredient) => ingredient.name.length > 0)

  for (const ingredient of ingredients) {
    if (ingredient.quantity !== undefined) {
      assert(
        Number.isFinite(ingredient.quantity) && ingredient.quantity > 0,
        `Quantity for "${ingredient.name}" must be greater than zero`,
      )
    }
  }

  return defined({
    title,
    description: input.description?.trim() || undefined,
    servings: input.servings,
    prepTimeMinutes: input.prepTimeMinutes,
    cookTimeMinutes: input.cookTimeMinutes,
    tags: [
      ...new Set(
        input.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      ),
    ],
    ingredients,
    steps: input.steps.map((step) => step.trim()).filter(Boolean),
  })
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function validateDate(date: string): string {
  assert(ISO_DATE.test(date), 'Date must be in YYYY-MM-DD format')
  return date
}

export function validateServings(servings: number): number {
  assert(Number.isFinite(servings), 'Servings must be a number')
  assert(servings >= 1 && servings <= 100, 'Servings must be 1 to 100')
  return servings
}
