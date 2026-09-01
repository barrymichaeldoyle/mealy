import type { MutationCtx } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import { DEFAULT_CATEGORIES } from './shops'

/**
 * Give a household the starting aisles, once. Called wherever a household
 * comes into being or first opens the app, so the categories are already
 * there the first time a list is grouped rather than appearing after a trip
 * to a settings screen.
 *
 * Deliberately does nothing when a household has any categories at all: a
 * household that deleted the lot meant it.
 */
export async function seedCategories(
  ctx: MutationCtx,
  householdId: Id<'households'>,
): Promise<void> {
  const existing = await ctx.db
    .query('categories')
    .withIndex('by_household', (q) => q.eq('householdId', householdId))
    .first()
  if (existing) {
    return
  }

  for (const [index, name] of DEFAULT_CATEGORIES.entries()) {
    await ctx.db.insert('categories', {
      householdId,
      name,
      sortOrder: index * 10,
    })
  }
}
