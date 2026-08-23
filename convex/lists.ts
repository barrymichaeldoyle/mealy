import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { unitValidator } from './schema'
import { assertHousehold, getHouseholdId, requireHousehold } from './lib/auth'
import { validateDate } from './lib/validation'
import { consolidate, type ConsolidationInput } from './lib/units'
import { ingredientInputs } from './lib/lists'
import { formatShortDate } from './lib/dates'
import { defined } from './lib/optional'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const householdId = await getHouseholdId(ctx)
    if (!householdId) {
      return []
    }

    const lists = await ctx.db
      .query('shoppingLists')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
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
    const householdId = await getHouseholdId(ctx)
    if (!householdId) {
      return null
    }
    const shoppingList = await ctx.db.get(args.id)
    if (!shoppingList || shoppingList.householdId !== householdId) {
      return null
    }

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
 * Two shops for the same week are allowed, but two lists called the same
 * thing are not tellable apart in the index, so the later one is numbered.
 */
async function uniqueListName(
  ctx: MutationCtx,
  householdId: Id<'households'>,
  wanted: string,
): Promise<string> {
  const existing = await ctx.db
    .query('shoppingLists')
    .withIndex('by_household', (q) => q.eq('householdId', householdId))
    .collect()

  const taken = new Set(existing.map((shoppingList) => shoppingList.name))
  if (!taken.has(wanted)) {
    return wanted
  }

  let suffix = 2
  while (taken.has(`${wanted} (${suffix})`)) {
    suffix += 1
  }
  return `${wanted} (${suffix})`
}

async function insertConsolidated(
  ctx: MutationCtx,
  householdId: Id<'households'>,
  name: string,
  inputs: ConsolidationInput[],
): Promise<Id<'shoppingLists'>> {
  const listId = await ctx.db.insert('shoppingLists', {
    householdId,
    name,
    createdAt: Date.now(),
  })

  for (const item of consolidate(inputs)) {
    await ctx.db.insert('shoppingListItems', {
      ...defined({ quantity: item.quantity }),
      householdId,
      listId,
      name: item.name,
      unit: item.unit,
      checked: false,
      manuallyAdded: false,
      approximate: item.approximate,
      sourceRecipeIds: item.sourceRecipeIds as Id<'recipes'>[],
    })
  }

  return listId
}

export const generateFromPlan = mutation({
  args: {
    start: v.string(),
    end: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    const start = validateDate(args.start)
    const end = validateDate(args.end)

    const meals = await ctx.db
      .query('plannedMeals')
      .withIndex('by_household_and_date', (q) =>
        q.eq('householdId', householdId).gte('date', start).lte('date', end),
      )
      .collect()

    const inputs: ConsolidationInput[] = []
    for (const meal of meals) {
      const recipe = await ctx.db.get(meal.recipeId)
      if (!recipe || recipe.householdId !== householdId) {
        continue
      }
      inputs.push(...ingredientInputs(recipe, meal.servings))
    }

    const name = await uniqueListName(
      ctx,
      householdId,
      args.name?.trim() || `Week of ${formatShortDate(start)}`,
    )

    return await insertConsolidated(ctx, householdId, name, inputs)
  },
})

export const generateFromRecipes = mutation({
  args: {
    recipeIds: v.array(v.id('recipes')),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)

    const inputs: ConsolidationInput[] = []
    for (const recipeId of args.recipeIds) {
      const recipe = await ctx.db.get(recipeId)
      assertHousehold(recipe, householdId)
      inputs.push(...ingredientInputs(recipe!, recipe!.servings))
    }

    const name = await uniqueListName(
      ctx,
      householdId,
      args.name?.trim() || 'Shopping list',
    )

    return await insertConsolidated(ctx, householdId, name, inputs)
  },
})

export const rename = mutation({
  args: { id: v.id('shoppingLists'), name: v.string() },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)
    const name = args.name.trim()
    if (name) {
      await ctx.db.patch(args.id, { name })
    }
  },
})

export const remove = mutation({
  args: { id: v.id('shoppingLists') },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)

    const items = await ctx.db
      .query('shoppingListItems')
      .withIndex('by_list', (q) => q.eq('listId', args.id))
      .collect()
    for (const item of items) {
      await ctx.db.delete(item._id)
    }

    await ctx.db.delete(args.id)
  },
})

export const toggleItem = mutation({
  args: { id: v.id('shoppingListItems'), checked: v.boolean() },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)
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
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.listId), householdId)

    const name = args.name.trim()
    if (!name) {
      throw new Error('Item name is required')
    }

    return await ctx.db.insert('shoppingListItems', {
      ...defined({ quantity: args.quantity }),
      householdId,
      listId: args.listId,
      name,
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
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)

    const patch: {
      name?: string
      quantity?: number | undefined
      unit?: Doc<'shoppingListItems'>['unit']
      approximate?: boolean
    } = {}
    if (args.name !== undefined) {
      const name = args.name.trim()
      if (!name) {
        throw new Error('Item name is required')
      }
      patch.name = name
    }
    if (args.quantity !== undefined) {
      // `null` from the client means "clear the amount", which Convex spells
      // as an explicit undefined in the patch.
      patch.quantity = args.quantity ?? undefined
      // A hand-edited amount is exactly what the user asked for.
      patch.approximate = false
    }
    if (args.unit !== undefined) {
      patch.unit = args.unit
    }

    await ctx.db.patch(args.id, patch)
  },
})

export const removeItem = mutation({
  args: { id: v.id('shoppingListItems') },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)
    await ctx.db.delete(args.id)
  },
})

/** Clear every ticked item, the "I've packed the bags" action. */
export const clearChecked = mutation({
  args: { listId: v.id('shoppingLists') },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.listId), householdId)

    const items = await ctx.db
      .query('shoppingListItems')
      .withIndex('by_list', (q) => q.eq('listId', args.listId))
      .collect()
    for (const item of items) {
      if (item.checked) {
        await ctx.db.delete(item._id)
      }
    }
  },
})
