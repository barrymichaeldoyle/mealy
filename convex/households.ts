import { ConvexError, v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { unitSystemValidator, unitValidator } from './schema'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import {
  createHousehold,
  getMembership,
  getUserId,
  requireHousehold,
} from './lib/auth'
import {
  isUniversalUnit,
  normalizeName,
  systemsForUnits,
  unitsForSystems,
} from './lib/units'
import { seedCategories } from './lib/seed'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

async function members(ctx: QueryCtx, householdId: Id<'households'>) {
  const rows = await ctx.db
    .query('householdMembers')
    .withIndex('by_household', (q) => q.eq('householdId', householdId))
    .collect()
  return rows.toSorted((a, b) => a.joinedAt - b.joinedAt)
}

/** How much data would travel with someone who joins another household. */
async function dataCounts(ctx: QueryCtx, householdId: Id<'households'>) {
  const byHousehold = (table: 'recipes' | 'shoppingLists' | 'plannedMeals') =>
    ctx.db
      .query(table)
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()

  const [recipes, lists, meals] = await Promise.all([
    byHousehold('recipes'),
    byHousehold('shoppingLists'),
    byHousehold('plannedMeals'),
  ])

  return {
    recipes: recipes.length,
    lists: lists.length,
    plannedMeals: meals.length,
  }
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const membership = await getMembership(ctx)
    if (!membership) {
      return null
    }

    const household = await ctx.db.get(membership.householdId)
    if (!household) {
      return null
    }

    const invite = await ctx.db
      .query('householdInvites')
      .withIndex('by_household', (q) =>
        q.eq('householdId', membership.householdId),
      )
      .collect()
      .then((rows) =>
        rows
          .filter((row) => !row.acceptedBy && row.expiresAt > Date.now())
          .toSorted((a, b) => b.createdAt - a.createdAt)
          .at(0),
      )

    return {
      household,
      members: await members(ctx, membership.householdId),
      role: membership.role,
      userId: membership.userId,
      inviteToken: invite?.token ?? null,
      inviteExpiresAt: invite?.expiresAt ?? null,
    }
  },
})

/**
 * Called once when the app shell mounts. Queries cannot write, so this is
 * what turns a brand new Clerk user into a household of one, and what keeps
 * their display name in step with Clerk.
 */
export const ensureCurrent = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('Not signed in')
    }

    const name = args.name?.trim() || identity.name || 'Me'
    const existing = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .unique()

    if (existing) {
      if (existing.name !== name) {
        await ctx.db.patch(existing._id, { name })
      }
      // Households that predate aisles get them on their next visit rather
      // than on a migration nobody would remember to run.
      await seedCategories(ctx, existing.householdId)
      return existing.householdId
    }

    return await createHousehold(ctx, identity.subject, name)
  },
})

/**
 * Which measurement systems the recipe form offers. Answered on the setup
 * screen the first time, changeable from the household screen after that.
 * It changes nothing already saved: a recipe written in ounces still says
 * ounces, it just stops being offered on new rows.
 */
export const setUnitSystems = mutation({
  args: { systems: v.array(unitSystemValidator) },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    const systems = [...new Set(args.systems)]
    if (systems.length === 0) {
      throw new ConvexError('Pick at least one set of measurements')
    }
    // A system is a preset: picking one fills the unit list in, and anything
    // switched off by hand before is switched back on.
    await ctx.db.patch(householdId, {
      unitSystems: systems,
      units: unitsForSystems(systems).filter((unit) => !isUniversalUnit(unit)),
    })
  },
})

/**
 * The granular answer: exactly which units to offer, and which to restate
 * amounts into. Counts and "to taste" are not in the list, because they are
 * offered whatever anyone picks.
 *
 * `unitSystems` is kept in step so the setup gate still reads as answered
 * and so a household that later taps a preset starts from a sane place.
 */
export const setUnits = mutation({
  args: { units: v.array(unitValidator) },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    const units = [...new Set(args.units)].filter(
      (unit) => !isUniversalUnit(unit),
    )
    if (units.length === 0) {
      throw new ConvexError('Pick at least one unit')
    }
    await ctx.db.patch(householdId, {
      units,
      unitSystems: systemsForUnits(units),
    })
  },
})

export const rename = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    const name = args.name.trim()
    if (!name) {
      throw new ConvexError('Household name is required')
    }
    if (name.length > 60) {
      throw new ConvexError('Household name is too long')
    }
    await ctx.db.patch(householdId, { name })
  },
})

/**
 * One live invite per household: creating a new link retires the old one, so
 * a link shared by mistake stops working as soon as you make another.
 */
export const createInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, householdId } = await requireHousehold(ctx)

    const existing = await ctx.db
      .query('householdInvites')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    for (const invite of existing) {
      if (!invite.acceptedBy) {
        await ctx.db.delete(invite._id)
      }
    }

    const token = crypto.randomUUID().replaceAll('-', '')
    await ctx.db.insert('householdInvites', {
      householdId,
      token,
      createdBy: userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + INVITE_TTL_MS,
    })
    return token
  },
})

export const revokeInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const { householdId } = await requireHousehold(ctx)
    const invites = await ctx.db
      .query('householdInvites')
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    for (const invite of invites) {
      if (!invite.acceptedBy) {
        await ctx.db.delete(invite._id)
      }
    }
  },
})

export type InviteStatus =
  | 'valid'
  | 'unknown'
  | 'expired'
  | 'used'
  | 'own-household'

/**
 * What the join screen needs before the user commits: whose household this
 * is, and what happens to the data they already have.
 */
export const invite = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx)
    if (!userId) {
      return null
    }

    const found = await ctx.db
      .query('householdInvites')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique()

    const membership = await getMembership(ctx)

    // Someone reopening the link they already accepted is in the household,
    // not looking at a dead link.
    if (found && membership?.householdId === found.householdId) {
      return { status: 'own-household' as InviteStatus, household: null }
    }

    const status: InviteStatus = !found
      ? 'unknown'
      : found.acceptedBy
        ? 'used'
        : found.expiresAt < Date.now()
          ? 'expired'
          : 'valid'

    if (!found || status !== 'valid') {
      return { status, household: null }
    }

    const household = await ctx.db.get(found.householdId)
    if (!household) {
      return { status: 'unknown' as InviteStatus, household: null }
    }

    const mine = membership
      ? {
          counts: await dataCounts(ctx, membership.householdId),
          // Data in a household you share is not yours alone to take.
          canMove: (await members(ctx, membership.householdId)).length === 1,
        }
      : { counts: { recipes: 0, lists: 0, plannedMeals: 0 }, canMove: true }

    return {
      status,
      household: {
        name: household.name,
        memberNames: (await members(ctx, found.householdId)).map(
          (member) => member.name,
        ),
      },
      mine,
    }
  },
})

/**
 * Fold one household's shops and aisles into another's, by name.
 *
 * Two households that both call it Woolworths mean the same shop, so the
 * arriving lists point at the one already there rather than at a second copy
 * of the same name. Anything the target has never heard of moves across
 * intact.
 */
async function mergeShopsInto(
  ctx: MutationCtx,
  from: Id<'households'>,
  to: Id<'households'>,
): Promise<{
  stores: Map<Id<'stores'>, Id<'stores'>>
  categories: Map<Id<'categories'>, Id<'categories'>>
}> {
  const stores = new Map<Id<'stores'>, Id<'stores'>>()
  const categories = new Map<Id<'categories'>, Id<'categories'>>()

  for (const table of ['stores', 'categories'] as const) {
    const [mine, theirs] = await Promise.all([
      ctx.db
        .query(table)
        .withIndex('by_household', (q) => q.eq('householdId', from))
        .collect(),
      ctx.db
        .query(table)
        .withIndex('by_household', (q) => q.eq('householdId', to))
        .collect(),
    ])
    const byName = new Map(
      theirs.map((row) => [normalizeName(row.name), row._id]),
    )

    for (const row of mine) {
      const match = byName.get(normalizeName(row.name))
      if (match) {
        await ctx.db.delete(row._id)
      } else {
        await ctx.db.patch(row._id, { householdId: to })
      }
      const target = match ?? row._id
      if (table === 'stores') {
        stores.set(row._id as Id<'stores'>, target as Id<'stores'>)
      } else {
        categories.set(row._id as Id<'categories'>, target as Id<'categories'>)
      }
    }
  }

  return { stores, categories }
}

/** Reassign everything one household owns to another. */
async function moveHouseholdData(
  ctx: MutationCtx,
  from: Id<'households'>,
  to: Id<'households'>,
): Promise<void> {
  const mapping = await mergeShopsInto(ctx, from, to)

  const tables = [
    'recipes',
    'plannedMeals',
    'shoppingLists',
    'shoppingListItems',
  ] as const

  for (const table of tables) {
    const rows = await ctx.db
      .query(table)
      .withIndex('by_household', (q) => q.eq('householdId', from))
      .collect()
    for (const row of rows) {
      await ctx.db.patch(row._id, { householdId: to })

      if (table === 'shoppingLists' && 'storeId' in row && row.storeId) {
        await ctx.db.patch(row._id, {
          storeId: mapping.stores.get(row.storeId),
        })
      }
      if (
        table === 'shoppingListItems' &&
        'categoryId' in row &&
        row.categoryId
      ) {
        await ctx.db.patch(row._id, {
          categoryId: mapping.categories.get(row.categoryId),
        })
      }
    }
  }

  /*
   * The catalogue merges by name too, and the household being joined wins a
   * disagreement: they are the ones who know where their shops are.
   */
  const entries = await ctx.db
    .query('groceryItems')
    .withIndex('by_household', (q) => q.eq('householdId', from))
    .collect()
  for (const entry of entries) {
    const existing = await ctx.db
      .query('groceryItems')
      .withIndex('by_household_and_key', (q) =>
        q.eq('householdId', to).eq('key', entry.key),
      )
      .unique()
    if (existing) {
      await ctx.db.delete(entry._id)
      continue
    }
    await ctx.db.patch(entry._id, {
      householdId: to,
      storeIds: entry.storeIds.flatMap((storeId) => {
        const mapped = mapping.stores.get(storeId)
        return mapped ? [mapped] : []
      }),
      categoryId: entry.categoryId
        ? mapping.categories.get(entry.categoryId)
        : undefined,
    })
  }
}

/** Delete a household nobody belongs to any more, and anything left in it. */
async function discardHousehold(
  ctx: MutationCtx,
  householdId: Id<'households'>,
): Promise<void> {
  const tables = [
    'recipes',
    'plannedMeals',
    'shoppingLists',
    'shoppingListItems',
    'householdInvites',
    'stores',
    'categories',
    'groceryItems',
  ] as const

  for (const table of tables) {
    const rows = await ctx.db
      .query(table)
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    for (const row of rows) {
      await ctx.db.delete(row._id)
    }
  }
  await ctx.db.delete(householdId)
}

export const acceptInvite = mutation({
  args: {
    token: v.string(),
    moveData: v.boolean(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('Not signed in')
    }
    const userId = identity.subject

    const found = await ctx.db
      .query('householdInvites')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique()
    if (!found) {
      throw new ConvexError('That invite link is not valid')
    }

    const membership = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    // Already in: a second tap on Join should do nothing, not report an
    // error about the link it just consumed.
    if (membership?.householdId === found.householdId) {
      return found.householdId
    }

    if (found.acceptedBy) {
      throw new ConvexError('That invite has been used')
    }
    if (found.expiresAt < Date.now()) {
      throw new ConvexError('That invite has expired')
    }

    const target = await ctx.db.get(found.householdId)
    if (!target) {
      throw new ConvexError('That household no longer exists')
    }

    if (membership) {
      const previous = membership.householdId
      const others = await members(ctx, previous)
      const alone = others.length === 1

      if (args.moveData && !alone) {
        throw new ConvexError(
          'Your recipes are shared with someone else, so they stay where they are',
        )
      }

      if (args.moveData) {
        await moveHouseholdData(ctx, previous, found.householdId)
      }

      await ctx.db.delete(membership._id)
      if (alone) {
        await discardHousehold(ctx, previous)
      }
    }

    await ctx.db.insert('householdMembers', {
      householdId: found.householdId,
      userId,
      name: args.name?.trim() || identity.name || 'Me',
      role: 'member',
      joinedAt: Date.now(),
    })
    await ctx.db.patch(found._id, {
      acceptedBy: userId,
      acceptedAt: Date.now(),
    })

    return found.householdId
  },
})

/**
 * Step out of a shared household and back into one of your own. The data
 * stays behind with the people still in it.
 */
export const leave = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('Not signed in')
    }

    const membership = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .unique()
    if (!membership) {
      throw new ConvexError('You are not in a household')
    }

    const remaining = await members(ctx, membership.householdId)
    if (remaining.length === 1) {
      throw new ConvexError(
        'You are the only member, so there is nothing to leave',
      )
    }

    await ctx.db.delete(membership._id)
    return await createHousehold(
      ctx,
      identity.subject,
      args.name?.trim() || identity.name || 'Me',
    )
  },
})

/** Remove someone else from the household. Owners only. */
export const removeMember = mutation({
  args: { memberId: v.id('householdMembers') },
  handler: async (ctx, args) => {
    const { userId, householdId } = await requireHousehold(ctx)

    const me = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    if (me?.role !== 'owner') {
      throw new ConvexError('Only the household owner can remove members')
    }

    const target = await ctx.db.get(args.memberId)
    if (!target || target.householdId !== householdId) {
      throw new ConvexError('Not found')
    }
    if (target.userId === userId) {
      throw new ConvexError('You cannot remove yourself')
    }

    await ctx.db.delete(args.memberId)
  },
})

/**
 * Everything a Clerk account deletion has to take with it. Called by the
 * `user.deleted` webhook in http.ts, never by a client: the identity comes
 * from Clerk's signed payload rather than an argument a caller could forge,
 * which is why it is internal.
 *
 * The privacy policy promises this, so the shape of it is deliberate. A
 * household with other people in it keeps its recipes, plans and lists. A
 * household that was only ever theirs goes with them.
 */
export const deleteAccount = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // An invite records who made it, wherever that household is now, so
    // these go first and independently of membership.
    const created = await ctx.db
      .query('householdInvites')
      .withIndex('by_creator', (q) => q.eq('createdBy', args.userId))
      .collect()
    for (const row of created) {
      await ctx.db.delete(row._id)
    }

    const memberships = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    for (const membership of memberships) {
      const remaining = await members(ctx, membership.householdId)
      await ctx.db.delete(membership._id)

      if (remaining.length === 1) {
        await discardHousehold(ctx, membership.householdId)
        continue
      }

      // The household lives on, so only the spent invite naming them goes.
      const invites = await ctx.db
        .query('householdInvites')
        .withIndex('by_household', (q) =>
          q.eq('householdId', membership.householdId),
        )
        .collect()
      for (const row of invites) {
        if (row.acceptedBy === args.userId) {
          await ctx.db.delete(row._id)
        }
      }
    }

    return { households: memberships.length }
  },
})

/**
 * The whole household as one JSON document. The privacy policy offers a
 * portable copy on request, and this is what makes that a button rather than
 * a favour. Convex ids are left out: they identify rows in our database, not
 * anything the reader can use.
 */
export const exportData = query({
  args: {},
  handler: async (ctx) => {
    const membership = await getMembership(ctx)
    if (!membership) {
      return null
    }
    const household = await ctx.db.get(membership.householdId)
    if (!household) {
      return null
    }
    const householdId = membership.householdId

    const [recipes, meals, lists, items, stores, categories, filed] =
      await Promise.all([
        ctx.db
          .query('recipes')
          .withIndex('by_household', (q) => q.eq('householdId', householdId))
          .collect(),
        ctx.db
          .query('plannedMeals')
          .withIndex('by_household', (q) => q.eq('householdId', householdId))
          .collect(),
        ctx.db
          .query('shoppingLists')
          .withIndex('by_household', (q) => q.eq('householdId', householdId))
          .collect(),
        ctx.db
          .query('shoppingListItems')
          .withIndex('by_household', (q) => q.eq('householdId', householdId))
          .collect(),
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

    const storeNames = new Map(stores.map((store) => [store._id, store.name]))
    const aisleNames = new Map(
      categories.map((category) => [category._id, category.name]),
    )
    const titles = new Map(recipes.map((recipe) => [recipe._id, recipe.title]))

    return {
      household: {
        name: household.name,
        createdAt: household.createdAt,
        unitSystems: household.unitSystems ?? null,
      },
      members: (await members(ctx, householdId)).map((member) => ({
        name: member.name,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
      recipes: recipes.map((recipe) => ({
        title: recipe.title,
        description: recipe.description ?? null,
        servings: recipe.servings,
        prepTimeMinutes: recipe.prepTimeMinutes ?? null,
        cookTimeMinutes: recipe.cookTimeMinutes ?? null,
        tags: recipe.tags,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
      })),
      plannedMeals: meals.map((meal) => ({
        date: meal.date,
        slot: meal.slot,
        servings: meal.servings,
        recipe: titles.get(meal.recipeId) ?? null,
      })),
      stores: stores
        .toSorted((a, b) => a.sortOrder - b.sortOrder)
        .map((store) => store.name),
      categories: categories
        .toSorted((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => category.name),
      groceryItems: filed.map((entry) => ({
        name: entry.name,
        stores: entry.storeIds.flatMap((storeId) => {
          const name = storeNames.get(storeId)
          return name ? [name] : []
        }),
        category: entry.categoryId
          ? (aisleNames.get(entry.categoryId) ?? null)
          : null,
      })),
      shoppingLists: lists.map((list) => ({
        name: list.name,
        createdAt: list.createdAt,
        store: list.storeId ? (storeNames.get(list.storeId) ?? null) : null,
        items: items
          .filter((item) => item.listId === list._id)
          .map((item) => ({
            name: item.name,
            quantity: item.quantity ?? null,
            unit: item.unit,
            checked: item.checked,
            manuallyAdded: item.manuallyAdded,
            approximate: item.approximate,
            category: item.categoryId
              ? (aisleNames.get(item.categoryId) ?? null)
              : null,
          })),
      })),
    }
  },
})
