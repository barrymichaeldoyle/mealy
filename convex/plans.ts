import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { slotValidator } from './schema'
import { assertOwner, getUserId, requireUserId } from './lib/auth'
import { validateDate, validateServings } from './lib/validation'

/**
 * Planned meals for a date range, each joined to its recipe. The MVP UI only
 * renders the "dinner" slot, but the query returns every slot so surfacing
 * breakfast/lunch later is a UI-only change.
 */
export const listRange = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) return []

    const meals = await ctx.db
      .query('plannedMeals')
      .withIndex('by_user_and_date', (q) =>
        q.eq('userId', userId).gte('date', args.start).lte('date', args.end),
      )
      .collect()

    return await Promise.all(
      meals.map(async (meal) => {
        const recipe = await ctx.db.get(meal.recipeId)
        return {
          ...meal,
          recipe:
            recipe && recipe.userId === userId
              ? {
                  _id: recipe._id,
                  title: recipe.title,
                  servings: recipe.servings,
                  tags: recipe.tags,
                  prepTimeMinutes: recipe.prepTimeMinutes,
                  cookTimeMinutes: recipe.cookTimeMinutes,
                }
              : null,
        }
      }),
    )
  },
})

export const addMeal = mutation({
  args: {
    date: v.string(),
    slot: v.optional(slotValidator),
    recipeId: v.id('recipes'),
    servings: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const recipe = await ctx.db.get(args.recipeId)
    assertOwner(recipe, userId)

    return await ctx.db.insert('plannedMeals', {
      userId,
      date: validateDate(args.date),
      slot: args.slot ?? 'dinner',
      recipeId: args.recipeId,
      servings: validateServings(args.servings ?? recipe!.servings),
    })
  },
})

export const setServings = mutation({
  args: { id: v.id('plannedMeals'), servings: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    assertOwner(await ctx.db.get(args.id), userId)
    await ctx.db.patch(args.id, { servings: validateServings(args.servings) })
  },
})

/** Swap the recipe in a slot, keeping the day and servings. */
export const setRecipe = mutation({
  args: { id: v.id('plannedMeals'), recipeId: v.id('recipes') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    assertOwner(await ctx.db.get(args.id), userId)
    assertOwner(await ctx.db.get(args.recipeId), userId)
    await ctx.db.patch(args.id, { recipeId: args.recipeId })
  },
})

export const moveMeal = mutation({
  args: { id: v.id('plannedMeals'), date: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    assertOwner(await ctx.db.get(args.id), userId)
    await ctx.db.patch(args.id, { date: validateDate(args.date) })
  },
})

export const removeMeal = mutation({
  args: { id: v.id('plannedMeals') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    assertOwner(await ctx.db.get(args.id), userId)
    await ctx.db.delete(args.id)
  },
})
