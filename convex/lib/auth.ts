import { ConvexError } from 'convex/values'
import type { QueryCtx } from '../_generated/server'

/**
 * The signed-in user's Clerk subject. Every query and mutation derives the
 * user id from the verified identity — never from client-supplied arguments.
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

/** Guard every read/write of an existing document against its owner. */
export function assertOwner(
  doc: { userId: string } | null,
  userId: string,
): void {
  if (!doc || doc.userId !== userId) {
    throw new ConvexError('Not found')
  }
}
