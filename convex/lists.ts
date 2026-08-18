import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { unitValidator } from './schema'
import { assertOwner, getUserId, requireUserId } from './lib/auth'
import { validateDate } from './lib/validation'
import { consolidate, type ConsolidationInput } from './lib/units'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (!userId) return []

    const lists = await ctx.db
      .query('shoppingLists')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const withCounts = await Promise.all(
      lists.map(async (shoppingList) => {
        const items = await ctx.db
          .query('shoppingListItems')
          .withIndex('by_list', (q) => q.eq('listId', shoppingList._id))
          .collect()
        return {
          ...shoppingList,
          itemCount: items.length,
          checkedCount: items.filter((item) => item.checked).length,
        }
      }),
    )

    return withCounts.toSorted((a, b) => b.createdAt - a.createdAt)
  },
})

export const get = query({
  args: { id: v.id('shoppingLists') },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) return null
    const shoppingList = await ctx.db.get(args.id)
    if (!shoppingList || shoppingList.userId !== userId) return null

    const items = await ctx.db
      .query('shoppingListItems')
      .withIndex('by_list', (q) => q.eq('listId', args.id))
      .collect()

    return {
      ...shoppingList,
      items: items.toSorted((a, b) => a.name.localeCompare(b.name)),
    }
  },
})

/**
 * Turn consolidated lines into list rows. Shared by both generators so the
 * two entry points cannot drift apart.
 */
async function insertConsolidated(
  ctx: MutationCtx,
  userId: string,
  name: string,
  inputs: ConsolidationInput[],
): Promise<Id<'shoppingLists'>> {
  const listId = await ctx.db.insert('shoppingLists', {
    userId,
    name,
    createdAt: Date.now(),
  })

  for (const item of consolidate(inputs)) {
    await ctx.db.insert('shoppingListItems', {
      userId,
      listId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      checked: false,
      manuallyAdded: false,
      approximate: item.approximate,
      sourceRecipeIds: item.sourceRecipeIds as Id<'recipes'>[],
    })
  }

  return listId
}

function ingredientInputs(
  recipe: Doc<'recipes'>,
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

export const generateFromPlan = mutation({
  args: {
    start: v.string(),
    end: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const start = validateDate(args.start)
    const end = validateDate(args.end)

    const meals = await ctx.db
      .query('plannedMeals')
      .withIndex('by_user_and_date', (q) =>
        q.eq('userId', userId).gte('date', start).lte('date', end),
      )
      .collect()

    const inputs: ConsolidationInput[] = []
    for (const meal of meals) {
      const recipe = await ctx.db.get(meal.recipeId)
      if (!recipe || recipe.userId !== userId) continue
      inputs.push(...ingredientInputs(recipe, meal.servings))
    }

    return await insertConsolidated(
      ctx,
      userId,
      args.name?.trim() || `Week of ${start}`,
      inputs,
    )
  },
})

export const generateFromRecipes = mutation({
  args: {
    recipeIds: v.array(v.id('recipes')),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    const inputs: ConsolidationInput[] = []
    for (const recipeId of args.recipeIds) {
      const recipe = await ctx.db.get(recipeId)
      assertOwner(recipe, userId)
      inputs.push(...ingredientInputs(recipe!, recipe!.servings))
    }

    return await insertConsolidated(
      ctx,
      userId,
      args.name?.trim() || `Shopping list`,
      inputs,
    )
  },
})

export const rename = mutation({
  args: { id: v.id('shoppingLists'), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    assertOwner(await ctx.db.get(args.id), userId)
    const name = args.name.trim()
    if (name) await ctx.db.patch(args.id, { name })
  },
})

export const remove = mutation({
  args: { id: v.id('shoppingLists') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    assertOwner(await ctx.db.get(args.id), userId)

    const items = await ctx.db
      .query('shoppingListItems')
      .withIndex('by_list', (q) => q.eq('listId', args.id))
      .collect()
    for (const item of items) await ctx.db.delete(item._id)

    await ctx.db.delete(args.id)
  },
})

export const toggleItem = mutation({
  args: { id: v.id('shoppingListItems'), checked: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    assertOwner(await ctx.db.get(args.id), userId)
    await ctx.db.patch(args.id, { checked: args.checked })
  },
})

export const addItem = mutation({
  args: {
    listId: v.id('shoppingLists'),
    name: v.string(),
    quantity: v.optional(v.number()),
    unit: v.optional(unitValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    assertOwner(await ctx.db.get(args.listId), userId)

    const name = args.name.trim()
    if (!name) throw new Error('Item name is required')

    return await ctx.db.insert('shoppingListItems', {
      userId,
      listId: args.listId,
      name,
      quantity: args.quantity,
      unit: args.unit ?? 'none',
      checked: false,
      manuallyAdded: true,
      approximate: false,
      sourceRecipeIds: [],
    })
  },
})

export const updateItem = mutation({
  args: {
    id: v.id('shoppingListItems'),
    name: v.optional(v.string()),
    quantity: v.optional(v.union(v.number(), v.null())),
    unit: v.optional(unitValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    assertOwner(await ctx.db.get(args.id), userId)

    const patch: Partial<Doc<'shoppingListItems'>> = {}
    if (args.name !== undefined) {
      const name = args.name.trim()
      if (!name) throw new Error('Item name is required')
      patch.name = name
    }
    if (args.quantity !== undefined) {
      patch.quantity = args.quantity ?? undefined
      // A hand-edited amount is exactly what the user asked for.
      patch.approximate = false
    }
    if (args.unit !== undefined) patch.unit = args.unit

    await ctx.db.patch(args.id, patch)
  },
})

export const removeItem = mutation({
  args: { id: v.id('shoppingListItems') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    assertOwner(await ctx.db.get(args.id), userId)
    await ctx.db.delete(args.id)
  },
})

/** Clear every ticked item — the "I've packed the bags" action. */
export const clearChecked = mutation({
  args: { listId: v.id('shoppingLists') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    assertOwner(await ctx.db.get(args.listId), userId)

    const items = await ctx.db
      .query('shoppingListItems')
      .withIndex('by_list', (q) => q.eq('listId', args.listId))
      .collect()
    for (const item of items) {
      if (item.checked) await ctx.db.delete(item._id)
    }
  },
})
