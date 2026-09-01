import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { unitValidator } from './schema'
import { assertHousehold, getHouseholdId, requireHousehold } from './lib/auth'
import { validateDate } from './lib/validation'
import {
  consolidate,
  type ConsolidationInput,
  normalizeName,
  unitForAmount,
} from './lib/units'
import { ingredientInputs } from './lib/lists'
import { bucketOrder, catalogueIndex, routeByStore } from './lib/shops'
import { fileItem } from './shops'
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

    const stores = await ctx.db
      .query('stores')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    const storeNames = new Map(stores.map((store) => [store._id, store.name]))

    const withCounts = await Promise.all(
      lists.map(async (shoppingList) => {
        const items = await ctx.db
          .query('shoppingListItems')
          .withIndex('by_list', (q) => q.eq('listId', shoppingList._id))
          .collect()
        return {
          ...shoppingList,
          storeName: shoppingList.storeId
            ? (storeNames.get(shoppingList.storeId) ?? null)
            : null,
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

    /*
     * Names, not ids, because the list is read in a shop by the other
     * person. Resolved here rather than on the client so a row carries who
     * ticked it wherever it is rendered, including the offline copy.
     */
    const members = await ctx.db
      .query('householdMembers')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    const names = new Map(members.map((m) => [m.userId, m.name]))

    /*
     * The catalogue rides along so a row can say where else the thing is
     * sold. Moving it to the other shop is then a tap, which is the whole
     * point of having said milk is at both.
     */
    const [stores, categories, entries] = await Promise.all([
      ctx.db
        .query('stores')
        .withIndex('by_household', (q) => q.eq('householdId', householdId))
        .collect(),
      ctx.db
        .query('categories')
        .withIndex('by_household', (q) => q.eq('householdId', householdId))
        .collect(),
      ctx.db
        .query('groceryItems')
        .withIndex('by_household', (q) => q.eq('householdId', householdId))
        .collect(),
    ])
    const filed = catalogueIndex(entries)

    return {
      ...shoppingList,
      storeName: shoppingList.storeId
        ? (stores.find((store) => store._id === shoppingList.storeId)?.name ??
          null)
        : null,
      stores: stores.toSorted(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
      categories: categories.toSorted(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
      /** Absent for a household of one: there is nobody to tell apart. */
      sharedWith: members.length > 1 ? members.length : null,
      items: items
        .map((item) => ({
          ...item,
          checkedByName: item.checkedBy
            ? (names.get(item.checkedBy) ?? null)
            : null,
          storeIds: (filed.get(normalizeName(item.name))?.storeIds ??
            []) as Id<'stores'>[],
        }))
        .toSorted((a, b) => a.name.localeCompare(b.name)),
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

/**
 * Turn a week of cooking into the shops it actually takes.
 *
 * One list per shop, because that is how the trip goes: you are in
 * Woolworths or you are in Checkers, and a list holding both is a list you
 * have to read twice. Anything the household has not filed yet lands on an
 * unnamed list, which for a new household is the only list there is, and
 * which is exactly the old behaviour until stores exist.
 */
async function insertConsolidated(
  ctx: MutationCtx,
  householdId: Id<'households'>,
  name: string,
  inputs: ConsolidationInput[],
): Promise<Id<'shoppingLists'>[]> {
  const [stores, entries] = await Promise.all([
    ctx.db
      .query('stores')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect(),
    ctx.db
      .query('groceryItems')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect(),
  ])
  const filed = catalogueIndex(entries)

  const buckets = routeByStore(consolidate(inputs), filed, stores)
  const order = bucketOrder([...buckets.keys()], stores)

  const created: Id<'shoppingLists'>[] = []
  for (const key of order) {
    const store = stores.find((row) => row._id === key)
    const listId = await ctx.db.insert('shoppingLists', {
      ...defined({ storeId: store?._id }),
      householdId,
      // The shop goes first, since in a list of lists that is the word you
      // are looking for.
      name: await uniqueListName(
        ctx,
        householdId,
        store ? `${store.name}, ${name}` : name,
      ),
      createdAt: Date.now(),
    })
    created.push(listId)

    for (const item of buckets.get(key) ?? []) {
      await ctx.db.insert('shoppingListItems', {
        ...defined({
          quantity: item.quantity,
          categoryId: filed.get(normalizeName(item.name))?.categoryId as
            | Id<'categories'>
            | undefined,
        }),
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
  }

  return created
}

/**
 * A list that starts empty, named after wherever you are going. Every other
 * way in builds the list out of recipes, which is no help when the shop is
 * dish soap and nappies.
 */
export const create = mutation({
  args: { name: v.optional(v.string()), storeId: v.optional(v.id('stores')) },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)

    const store = args.storeId ? await ctx.db.get(args.storeId) : null
    if (args.storeId) {
      assertHousehold(store, householdId)
    }

    const name = await uniqueListName(
      ctx,
      householdId,
      args.name?.trim() || store?.name || 'Shopping list',
    )
    return await ctx.db.insert('shoppingLists', {
      ...defined({ storeId: store?._id }),
      householdId,
      name,
      createdAt: Date.now(),
    })
  },
})

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

    // Uniquifying is left to `insertConsolidated`, which knows how many
    // lists this is about to become and what each one ends up called.
    const name = args.name?.trim() || `Week of ${formatShortDate(start)}`

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

    const name = args.name?.trim() || 'Shopping list'

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

/**
 * Put back rows that were just cleared. The ids are new, which nothing on
 * screen can tell, and that is what lets clearing be undone rather than
 * confirmed twice.
 */
export const restoreItems = mutation({
  args: {
    listId: v.id('shoppingLists'),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.optional(v.number()),
        unit: unitValidator,
        checked: v.boolean(),
        manuallyAdded: v.boolean(),
        approximate: v.boolean(),
        sourceRecipeIds: v.array(v.id('recipes')),
        categoryId: v.optional(v.id('categories')),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.listId), householdId)

    for (const item of args.items) {
      await ctx.db.insert('shoppingListItems', {
        ...defined({
          quantity: item.quantity,
          categoryId: item.categoryId,
        }),
        householdId,
        listId: args.listId,
        name: item.name,
        unit: item.unit,
        checked: item.checked,
        manuallyAdded: item.manuallyAdded,
        approximate: item.approximate,
        sourceRecipeIds: item.sourceRecipeIds,
      })
    }
  },
})

export const toggleItem = mutation({
  args: { id: v.id('shoppingListItems'), checked: v.boolean() },
  handler: async (ctx, args) => {
    const { userId, householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)
    await ctx.db.patch(args.id, {
      checked: args.checked,
      // Unticking drops the name with it: nobody has it now.
      ...(args.checked ? { checkedBy: userId } : { checkedBy: undefined }),
    })
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

    const shoppingList = (await ctx.db.get(args.listId))!
    const filed = await ctx.db
      .query('groceryItems')
      .withIndex('by_household_and_key', (q) =>
        q.eq('householdId', householdId).eq('key', normalizeName(name)),
      )
      .unique()

    /*
     * Writing shampoo on the Clicks list is itself the answer to where
     * shampoo comes from, so it is recorded as one. Nothing is taken away:
     * a thing already known to be at two shops stays at two shops.
     */
    if (shoppingList.storeId) {
      const storeIds = filed?.storeIds ?? []
      if (!storeIds.includes(shoppingList.storeId)) {
        await fileItem(ctx, householdId, name, {
          storeIds: [...storeIds, shoppingList.storeId],
        })
      }
    }

    return await ctx.db.insert('shoppingListItems', {
      ...defined({ quantity: args.quantity, categoryId: filed?.categoryId }),
      householdId,
      listId: args.listId,
      name,
      unit: unitForAmount(args.quantity, args.unit ?? 'none'),
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
    const existing = await ctx.db.get(args.id)
    assertHousehold(existing, householdId)

    const patch: {
      name?: string
      quantity?: number | undefined
      unit?: Doc<'shoppingListItems'>['unit']
      approximate?: boolean
      categoryId?: Id<'categories'>
    } = {}
    if (args.name !== undefined) {
      const name = args.name.trim()
      if (!name) {
        throw new Error('Item name is required')
      }
      patch.name = name

      // Renamed to something the household has filed is renamed into that
      // aisle. Renamed to something new leaves the aisle alone rather than
      // quietly emptying it.
      if (normalizeName(name) !== normalizeName(existing!.name)) {
        const filed = await ctx.db
          .query('groceryItems')
          .withIndex('by_household_and_key', (q) =>
            q.eq('householdId', householdId).eq('key', normalizeName(name)),
          )
          .unique()
        if (filed?.categoryId) {
          patch.categoryId = filed.categoryId
        }
      }
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

    // Judged on the row as it will stand, since either field can be the one
    // being edited.
    patch.unit = unitForAmount(
      'quantity' in patch ? patch.quantity : existing!.quantity,
      patch.unit ?? existing!.unit,
    )

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

/**
 * Fold rows that are one ingredient under two names into a single row.
 *
 * The client only ever suggests this, and the user confirms it, because a
 * name that looks the same is a hint rather than a fact. Quantities go
 * through the same `consolidate` the generated lists use, so a mass and a
 * count under one name stay two lines rather than becoming nonsense.
 */
export const mergeItems = mutation({
  args: { ids: v.array(v.id('shoppingListItems')) },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    if (args.ids.length < 2) {
      throw new Error('Merging needs two items or more')
    }

    const items = []
    for (const id of args.ids) {
      const item = await ctx.db.get(id)
      assertHousehold(item, householdId)
      items.push(item!)
    }

    const listId = items[0]!.listId
    if (items.some((item) => item.listId !== listId)) {
      throw new Error('Those items are on different lists')
    }

    /*
     * The spelling the recipes lean on hardest wins, so merging settles on
     * the household's own habit rather than on whichever row sorted first.
     */
    const winner = items.toSorted(
      (a, b) =>
        b.sourceRecipeIds.length - a.sourceRecipeIds.length ||
        a.name.localeCompare(b.name),
    )[0]!

    const merged = consolidate(
      items.map((item) => ({
        name: winner.name,
        ...defined({ quantity: item.quantity }),
        unit: item.unit,
      })),
    )

    for (const item of items) {
      await ctx.db.delete(item._id)
    }

    const created: Id<'shoppingListItems'>[] = []
    for (const item of merged) {
      created.push(
        await ctx.db.insert('shoppingListItems', {
          ...defined({ quantity: item.quantity }),
          householdId,
          listId,
          name: item.name,
          unit: item.unit,
          // Outstanding unless every row that went in was already in the
          // basket. Half of it in the trolley is not the whole of it.
          checked: items.every((source) => source.checked),
          manuallyAdded: items.every((source) => source.manuallyAdded),
          approximate: item.approximate,
          ...defined({ categoryId: winner.categoryId }),
          sourceRecipeIds: [
            ...new Set(items.flatMap((source) => source.sourceRecipeIds)),
          ],
        }),
      )
    }

    return created
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
