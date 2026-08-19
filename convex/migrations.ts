import { internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { createHousehold } from './lib/auth'

/**
 * One-off backfill for data written before households existed, when every row
 * carried a `userId`. Each distinct user gets a household of one and their
 * rows are reassigned to it. Nobody is put in a shared household by this: the
 * two of you still have to swap an invite link.
 *
 * Run it against a deployment that still holds pre-household rows:
 *
 *   1. Set `schemaValidation: false` in convex/schema.ts and push, so the old
 *      rows are allowed through the door.
 *   2. npx convex run migrations:backfillHouseholds
 *   3. Restore schema validation and push again.
 *
 * Safe to run twice: rows that already have a householdId are skipped.
 */
export const backfillHouseholds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      'recipes',
      'plannedMeals',
      'shoppingLists',
      'shoppingListItems',
    ] as const

    const households = new Map<string, Id<'households'>>()
    let moved = 0

    for (const table of tables) {
      for (const row of await ctx.db.query(table).collect()) {
        const legacy = row as {
          householdId?: Id<'households'>
          userId?: string
        }
        if (legacy.householdId || !legacy.userId) {
          continue
        }

        const householdId =
          households.get(legacy.userId) ??
          (await claimHousehold(ctx, legacy.userId))
        households.set(legacy.userId, householdId)

        await ctx.db.patch(row._id, {
          householdId,
          userId: undefined,
        } as never)
        moved += 1
      }
    }

    return { rows: moved, households: households.size }
  },
})

/** Reuse the household this user already belongs to, or make them one. */
async function claimHousehold(
  ctx: MutationCtx,
  userId: string,
): Promise<Id<'households'>> {
  const membership = await ctx.db
    .query('householdMembers')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()
  if (membership) {
    return membership.householdId
  }
  return await createHousehold(ctx, userId, 'Me', 'Our kitchen')
}
