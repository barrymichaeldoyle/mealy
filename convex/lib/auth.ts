import { ConvexError } from 'convex/values'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { seedCategories } from './seed'

/**
 * The signed-in user's Clerk subject. Every query and mutation derives the
 * user id from the verified identity, never from client-supplied arguments.
 */
export async function requireUserId(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError('Not signed in')
  }
  return identity.subject
}

/** Null instead of throwing, for queries that render before auth settles. */
export async function getUserId(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity()
  return identity?.subject ?? null
}

/** The caller's membership row, or null if they are signed out. */
export async function getMembership(
  ctx: QueryCtx,
): Promise<Doc<'householdMembers'> | null> {
  const userId = await getUserId(ctx)
  if (!userId) {
    return null
  }
  return await ctx.db
    .query('householdMembers')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
}

/** The household whose data the caller should see, or null when signed out. */
export async function getHouseholdId(
  ctx: QueryCtx,
): Promise<Id<'households'> | null> {
  const membership = await getMembership(ctx)
  return membership?.householdId ?? null
}

/**
 * The caller's household, created on the spot if they do not have one yet.
 * Signing in is enough to own a household, so no mutation has to cope with a
 * user who has nowhere to write.
 */
export async function requireHousehold(
  ctx: MutationCtx,
): Promise<{ userId: string; householdId: Id<'households'> }> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError('Not signed in')
  }
  const userId = identity.subject

  const existing = await ctx.db
    .query('householdMembers')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
  if (existing) {
    return { userId, householdId: existing.householdId }
  }

  const name = identity.name ?? identity.nickname ?? 'Me'
  const householdId = await createHousehold(ctx, userId, name)
  return { userId, householdId }
}

/** A household of one, owned by the user who just arrived. */
export async function createHousehold(
  ctx: MutationCtx,
  userId: string,
  memberName: string,
  householdName?: string,
): Promise<Id<'households'>> {
  const householdId = await ctx.db.insert('households', {
    name: householdName?.trim() || defaultHouseholdName(memberName),
    createdAt: Date.now(),
  })
  await ctx.db.insert('householdMembers', {
    householdId,
    userId,
    name: memberName,
    role: 'owner',
    joinedAt: Date.now(),
  })
  await seedCategories(ctx, householdId)
  return householdId
}

export function defaultHouseholdName(memberName: string): string {
  const first = memberName.trim().split(/\s+/)[0]
  return first ? `${first}’s kitchen` : 'My kitchen'
}

/** Guard every read/write of an existing document against its household. */
export function assertHousehold(
  doc: { householdId: Id<'households'> } | null,
  householdId: Id<'households'>,
): void {
  if (!doc || doc.householdId !== householdId) {
    throw new ConvexError('Not found')
  }
}
