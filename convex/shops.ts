import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { assertHousehold, getHouseholdId, requireHousehold } from './lib/auth'
import { normalizeName } from './lib/units'
import { nextSortOrder } from './lib/shops'
import { defined } from './lib/optional'

const MAX_NAME = 40

function cleanName(name: string, what: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!trimmed) {
    throw new ConvexError(`${what} needs a name`)
  }
  if (trimmed.length > MAX_NAME) {
    throw new ConvexError(`That ${what.toLowerCase()} name is too long`)
  }
  return trimmed
}

async function storesFor(ctx: QueryCtx, householdId: Id<'households'>) {
  const rows = await ctx.db
    .query('stores')
    .withIndex('by_household', (q) => q.eq('householdId', householdId))
    .collect()
  return rows.toSorted(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  )
}

async function categoriesFor(ctx: QueryCtx, householdId: Id<'households'>) {
  const rows = await ctx.db
    .query('categories')
    .withIndex('by_household', (q) => q.eq('householdId', householdId))
    .collect()
  return rows.toSorted(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  )
}

/** Stores and aisles together: every screen that needs one needs the other. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const householdId = await getHouseholdId(ctx)
    if (!householdId) {
      return { stores: [], categories: [] }
    }
    return {
      stores: await storesFor(ctx, householdId),
      categories: await categoriesFor(ctx, householdId),
    }
  },
})

/**
 * Everything the household has filed, for the screen that lets you correct
 * it. Names are what was last typed, so this reads like a shopping habit
 * rather than a database.
 */
export const catalogue = query({
  args: {},
  handler: async (ctx) => {
    const householdId = await getHouseholdId(ctx)
    if (!householdId) {
      return []
    }
    const rows = await ctx.db
      .query('groceryItems')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    return rows.toSorted((a, b) => a.name.localeCompare(b.name))
  },
})

export const addStore = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    const name = cleanName(args.name, 'Shop')

    const existing = await storesFor(ctx, householdId)
    const clash = existing.find(
      (store) => normalizeName(store.name) === normalizeName(name),
    )
    // Adding a shop you already have is a tap on the wrong button, not a
    // second Checkers.
    if (clash) {
      return clash._id
    }

    return await ctx.db.insert('stores', {
      householdId,
      name,
      sortOrder: nextSortOrder(existing),
    })
  },
})

export const renameStore = mutation({
  args: { id: v.id('stores'), name: v.string() },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)
    await ctx.db.patch(args.id, { name: cleanName(args.name, 'Shop') })
  },
})

/**
 * Drop a shop, and unpick it from everywhere it is named. Lists made for it
 * survive as lists for no shop in particular: the shopping still has to be
 * done, whatever happened to the branch.
 */
export const removeStore = mutation({
  args: { id: v.id('stores') },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)

    const entries = await ctx.db
      .query('groceryItems')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    for (const entry of entries) {
      if (entry.storeIds.includes(args.id)) {
        await ctx.db.patch(entry._id, {
          storeIds: entry.storeIds.filter((storeId) => storeId !== args.id),
        })
      }
    }

    const lists = await ctx.db
      .query('shoppingLists')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    for (const shoppingList of lists) {
      if (shoppingList.storeId === args.id) {
        await ctx.db.patch(shoppingList._id, { storeId: undefined })
      }
    }

    await ctx.db.delete(args.id)
  },
})

/** Reorder by handing back every id in the order you want to shop them. */
export const reorderStores = mutation({
  args: { ids: v.array(v.id('stores')) },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    for (const [index, id] of args.ids.entries()) {
      assertHousehold(await ctx.db.get(id), householdId)
      await ctx.db.patch(id, { sortOrder: index * 10 })
    }
  },
})

export const addCategory = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    const name = cleanName(args.name, 'Aisle')

    const existing = await categoriesFor(ctx, householdId)
    const clash = existing.find(
      (category) => normalizeName(category.name) === normalizeName(name),
    )
    if (clash) {
      return clash._id
    }

    return await ctx.db.insert('categories', {
      householdId,
      name,
      sortOrder: nextSortOrder(existing),
    })
  },
})

export const renameCategory = mutation({
  args: { id: v.id('categories'), name: v.string() },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)
    await ctx.db.patch(args.id, { name: cleanName(args.name, 'Aisle') })
  },
})

/** Items filed under a deleted aisle fall back to the unsorted section. */
export const removeCategory = mutation({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)

    const entries = await ctx.db
      .query('groceryItems')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    for (const entry of entries) {
      if (entry.categoryId === args.id) {
        await ctx.db.patch(entry._id, { categoryId: undefined })
      }
    }

    const items = await ctx.db
      .query('shoppingListItems')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    for (const item of items) {
      if (item.categoryId === args.id) {
        await ctx.db.patch(item._id, { categoryId: undefined })
      }
    }

    await ctx.db.delete(args.id)
  },
})

export const reorderCategories = mutation({
  args: { ids: v.array(v.id('categories')) },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    for (const [index, id] of args.ids.entries()) {
      assertHousehold(await ctx.db.get(id), householdId)
      await ctx.db.patch(id, { sortOrder: index * 10 })
    }
  },
})

/**
 * File a thing: which shops sell it, and which aisle it is in. Written
 * against the name rather than a list row, because the answer is about the
 * ingredient and outlives the week it was asked in.
 */
export async function fileItem(
  ctx: MutationCtx,
  householdId: Id<'households'>,
  name: string,
  placement: {
    storeIds?: Id<'stores'>[] | undefined
    categoryId?: Id<'categories'> | null | undefined
  },
): Promise<void> {
  const key = normalizeName(name)
  if (!key) {
    return
  }

  const existing = await ctx.db
    .query('groceryItems')
    .withIndex('by_household_and_key', (q) =>
      q.eq('householdId', householdId).eq('key', key),
    )
    .unique()

  // `null` means "no aisle", which Convex stores as an absent field;
  // `undefined` means the caller is not answering that question at all.
  const categoryPatch =
    placement.categoryId === undefined
      ? {}
      : { categoryId: placement.categoryId ?? undefined }

  if (existing) {
    await ctx.db.patch(existing._id, {
      name: name.trim(),
      ...(placement.storeIds ? { storeIds: placement.storeIds } : {}),
      ...categoryPatch,
    })
    return
  }

  await ctx.db.insert('groceryItems', {
    ...defined({ categoryId: placement.categoryId ?? undefined }),
    householdId,
    name: name.trim(),
    key,
    storeIds: placement.storeIds ?? [],
  })
}

/**
 * The one write the list screen makes when you tell it where something
 * comes from. It updates the catalogue for next time and the rows on this
 * list for right now, since a shopper who has just filed the coriander
 * expects it to move into fruit & veg under their thumb.
 */
export const setPlacement = mutation({
  args: {
    name: v.string(),
    storeIds: v.optional(v.array(v.id('stores'))),
    categoryId: v.optional(v.union(v.id('categories'), v.null())),
  },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)

    for (const storeId of args.storeIds ?? []) {
      assertHousehold(await ctx.db.get(storeId), householdId)
    }
    if (args.categoryId) {
      assertHousehold(await ctx.db.get(args.categoryId), householdId)
    }

    await fileItem(ctx, householdId, args.name, {
      storeIds: args.storeIds,
      categoryId: args.categoryId,
    })

    if (args.categoryId !== undefined) {
      const key = normalizeName(args.name)
      const items = await ctx.db
        .query('shoppingListItems')
        .withIndex('by_household', (q) => q.eq('householdId', householdId))
        .collect()
      for (const item of items) {
        if (normalizeName(item.name) === key) {
          await ctx.db.patch(item._id, {
            categoryId: args.categoryId ?? undefined,
          })
        }
      }
    }
  },
})

/** Forget a thing entirely, back to the state before it was ever filed. */
export const forgetItem = mutation({
  args: { id: v.id('groceryItems') },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    assertHousehold(await ctx.db.get(args.id), householdId)
    await ctx.db.delete(args.id)
  },
})
