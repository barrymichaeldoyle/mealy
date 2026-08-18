import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import {
  createHousehold,
  getMembership,
  getUserId,
  requireHousehold,
} from './lib/auth'

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
    if (!membership) return null

    const household = await ctx.db.get(membership.householdId)
    if (!household) return null

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
    if (!identity) throw new ConvexError('Not signed in')

    const name = args.name?.trim() || identity.name || 'Me'
    const existing = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .unique()

    if (existing) {
      if (existing.name !== name) await ctx.db.patch(existing._id, { name })
      return existing.householdId
    }

    return await createHousehold(ctx, identity.subject, name)
  },
})

export const rename = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { householdId } = await requireHousehold(ctx)
    const name = args.name.trim()
    if (!name) throw new ConvexError('Household name is required')
    if (name.length > 60) throw new ConvexError('Household name is too long')
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
      if (!invite.acceptedBy) await ctx.db.delete(invite._id)
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
      if (!invite.acceptedBy) await ctx.db.delete(invite._id)
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
    if (!userId) return null

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

    if (!found || status !== 'valid') return { status, household: null }

    const household = await ctx.db.get(found.householdId)
    if (!household)
      return { status: 'unknown' as InviteStatus, household: null }

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

/** Reassign everything one household owns to another. */
async function moveHouseholdData(
  ctx: MutationCtx,
  from: Id<'households'>,
  to: Id<'households'>,
): Promise<void> {
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
    for (const row of rows) await ctx.db.patch(row._id, { householdId: to })
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
  ] as const

  for (const table of tables) {
    const rows = await ctx.db
      .query(table)
      .withIndex('by_household', (q) => q.eq('householdId', householdId))
      .collect()
    for (const row of rows) await ctx.db.delete(row._id)
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
    if (!identity) throw new ConvexError('Not signed in')
    const userId = identity.subject

    const found = await ctx.db
      .query('householdInvites')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique()
    if (!found) throw new ConvexError('That invite link is not valid')

    const membership = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    // Already in: a second tap on Join should do nothing, not report an
    // error about the link it just consumed.
    if (membership?.householdId === found.householdId) return found.householdId

    if (found.acceptedBy) throw new ConvexError('That invite has been used')
    if (found.expiresAt < Date.now()) {
      throw new ConvexError('That invite has expired')
    }

    const target = await ctx.db.get(found.householdId)
    if (!target) throw new ConvexError('That household no longer exists')

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
      if (alone) await discardHousehold(ctx, previous)
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
    if (!identity) throw new ConvexError('Not signed in')

    const membership = await ctx.db
      .query('householdMembers')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .unique()
    if (!membership) throw new ConvexError('You are not in a household')

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
