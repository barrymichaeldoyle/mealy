import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { ingredientValidator } from './schema'
import { assertHousehold, getHouseholdId, requireHousehold } from './lib/auth'
import { validateRecipe } from './lib/validation'

const recipeFields = {
  title: v.string(),
  description: v.optional(v.string()),
  servings: v.number(),
  prepTimeMinutes: v.optional(v.number()),
  cookTimeMinutes: v.optional(v.number()),
  tags: v.array(v.string()),
  ingredients: v.array(ingredientValidator),
  steps: v.array(v.string()),
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const householdId = await getHouseholdId(ctx)
    if (!householdId) return []
    const recipes = await ctx.db
      .query('recipes')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    return recipes.toSorted((a, b) => a.title.localeCompare(b.title))
  },
})

export const get = query({
  args: { id: v.id('recipes') },
  handler: async (ctx, args) => {
    const householdId = await getHouseholdId(ctx)
    if (!householdId) return null
    const recipe = await ctx.db.get(args.id)
    if (!recipe || recipe.householdId !== householdId) return null
    return recipe
  },
})

export const create = mutation({
  args: recipeFields,
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    return await ctx.db.insert('recipes', {
      householdId,
      ...validateRecipe(args),
    })
  },
})

export const update = mutation({
  args: { id: v.id('recipes'), ...recipeFields },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    const { id, ...fields } = args
    assertHousehold(await ctx.db.get(id), householdId)
    await ctx.db.patch(id, validateRecipe(fields))
    return id
  },
})

export const remove = mutation({
  args: { id: v.id('recipes') },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)

    // Planned meals point at this recipe, so they go with it. Shopping list
    // items are snapshots and deliberately survive.
    const planned = await ctx.db
      .query('plannedMeals')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    for (const meal of planned) {
      if (meal.recipeId === args.id) await ctx.db.delete(meal._id)
    }

    await ctx.db.delete(args.id)
  },
})
