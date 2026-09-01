import { describe, expect, test } from 'vitest'
import { convexTest } from 'convex-test'
import { api, internal } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

const BARRY = { subject: 'user_barry', name: 'Barry' }
const SAM = { subject: 'user_sam', name: 'Sam' }

function setup() {
  return convexTest(schema, modules)
}

/** A recipe, a planned meal and a generated list: one of everything. */
async function seed(
  t: ReturnType<typeof setup>,
  identity: { subject: string; name: string },
) {
  const as = t.withIdentity(identity)
  const recipeId = await as.mutation(api.recipes.create, {
    title: 'Bobotie',
    servings: 4,
    tags: ['bake'],
    ingredients: [{ name: 'mince', quantity: 500, unit: 'g' as const }],
    steps: ['Brown the mince.'],
  })
  await as.mutation(api.plans.addMeal, { date: '2026-08-18', recipeId })
  await as.mutation(api.lists.generateFromRecipes, { recipeIds: [recipeId] })
  return recipeId
}

/** Every row left in the database, so nothing can hide behind a filter. */
async function remaining(t: ReturnType<typeof setup>) {
  return await t.run(async (ctx) => ({
    households: (await ctx.db.query('households').collect()).length,
    members: (await ctx.db.query('householdMembers').collect()).length,
    invites: (await ctx.db.query('householdInvites').collect()).length,
    recipes: (await ctx.db.query('recipes').collect()).length,
    plannedMeals: (await ctx.db.query('plannedMeals').collect()).length,
    shoppingLists: (await ctx.db.query('shoppingLists').collect()).length,
    shoppingListItems: (await ctx.db.query('shoppingListItems').collect())
      .length,
  }))
}

/** Barry and Sam sharing one household, with Barry as its owner. */
async function shared() {
  const t = setup()
  await seed(t, BARRY)
  const token = await t
    .withIdentity(BARRY)
    .mutation(api.households.createInvite, {})
  await t
    .withIdentity(SAM)
    .mutation(api.households.acceptInvite, { token, moveData: false })
  return t
}

describe('deleteAccount', () => {
  test('takes a solo household and everything in it', async () => {
    const t = setup()
    await seed(t, BARRY)

    await t.mutation(internal.households.deleteAccount, {
      userId: BARRY.subject,
    })

    expect(await remaining(t)).toEqual({
      households: 0,
      members: 0,
      invites: 0,
      recipes: 0,
      plannedMeals: 0,
      shoppingLists: 0,
      shoppingListItems: 0,
    })
  })

  test('deletes a pending invite the departing user created', async () => {
    const t = setup()
    await seed(t, BARRY)
    await t.withIdentity(BARRY).mutation(api.households.createInvite, {})

    await t.mutation(internal.households.deleteAccount, {
      userId: BARRY.subject,
    })

    expect((await remaining(t)).invites).toBe(0)
  })

  test('leaves a shared household and its data with the people still in it', async () => {
    const t = await shared()

    await t.mutation(internal.households.deleteAccount, {
      userId: BARRY.subject,
    })

    const left = await remaining(t)
    expect(left.households).toBe(1)
    expect(left.members).toBe(1)
    expect(left.recipes).toBe(1)
    expect(left.plannedMeals).toBe(1)
    expect(left.shoppingLists).toBe(1)

    // Sam still sees the kitchen, and Barry is gone from it.
    const sam = await t.withIdentity(SAM).query(api.households.current)
    expect(sam?.members.map((member) => member.name)).toEqual(['Sam'])
  })

  test('scrubs the spent invite that names the deleted user', async () => {
    const t = await shared()

    // Sam accepted Barry's invite, so the row names them both.
    expect((await remaining(t)).invites).toBe(1)
    await t.mutation(internal.households.deleteAccount, {
      userId: SAM.subject,
    })

    expect((await remaining(t)).invites).toBe(0)
  })

  test('reaches an invite made for a household the user has left', async () => {
    const t = await shared()
    // Barry leaves the household he made the invite for.
    await t.withIdentity(BARRY).mutation(api.households.leave, {})
    const before = await t.run(async (ctx) =>
      (await ctx.db.query('householdInvites').collect()).map(
        (invite) => invite.createdBy,
      ),
    )
    expect(before).toEqual([BARRY.subject])

    await t.mutation(internal.households.deleteAccount, {
      userId: BARRY.subject,
    })

    expect((await remaining(t)).invites).toBe(0)
  })

  test('does nothing for a user who was never here', async () => {
    const t = setup()
    await seed(t, BARRY)
    const before = await remaining(t)

    const result = await t.mutation(internal.households.deleteAccount, {
      userId: 'user_stranger',
    })

    expect(result).toEqual({ households: 0 })
    expect(await remaining(t)).toEqual(before)
  })

  test('runs clean a second time', async () => {
    const t = setup()
    await seed(t, BARRY)

    await t.mutation(internal.households.deleteAccount, {
      userId: BARRY.subject,
    })
    await t.mutation(internal.households.deleteAccount, {
      userId: BARRY.subject,
    })

    expect((await remaining(t)).households).toBe(0)
  })
})

describe('exportData', () => {
  test('returns the household, its people and everything in it', async () => {
    const t = setup()
    await seed(t, BARRY)

    const data = await t.withIdentity(BARRY).query(api.households.exportData)

    expect(data?.household.name).toBe('Barry’s kitchen')
    expect(data?.members).toEqual([
      { name: 'Barry', role: 'owner', joinedAt: expect.any(Number) },
    ])
    expect(data?.recipes).toEqual([
      {
        title: 'Bobotie',
        description: null,
        servings: 4,
        prepTimeMinutes: null,
        cookTimeMinutes: null,
        tags: ['bake'],
        ingredients: [{ name: 'mince', quantity: 500, unit: 'g' }],
        steps: ['Brown the mince.'],
      },
    ])
    expect(data?.plannedMeals).toEqual([
      { date: '2026-08-18', slot: 'dinner', servings: 4, recipe: 'Bobotie' },
    ])
    expect(data?.shoppingLists).toHaveLength(1)
    expect(data?.shoppingLists[0]?.items).toEqual([
      {
        category: null,
        name: 'mince',
        quantity: 500,
        unit: 'g',
        checked: false,
        manuallyAdded: false,
        approximate: false,
      },
    ])
  })

  test('carries no Convex ids or Clerk user ids', async () => {
    const t = setup()
    await seed(t, BARRY)

    const data = await t.withIdentity(BARRY).query(api.households.exportData)
    const json = JSON.stringify(data)

    expect(json).not.toContain(BARRY.subject)
    expect(json).not.toContain('_id')
    expect(json).not.toContain('householdId')
  })

  test('is null for someone signed out', async () => {
    const t = setup()
    await seed(t, BARRY)
    expect(await t.query(api.households.exportData)).toBeNull()
  })

  test('never reaches another household', async () => {
    const t = setup()
    await seed(t, BARRY)
    await seed(t, SAM)

    const data = await t.withIdentity(SAM).query(api.households.exportData)

    expect(data?.household.name).toBe('Sam’s kitchen')
    expect(data?.members).toEqual([
      { name: 'Sam', role: 'owner', joinedAt: expect.any(Number) },
    ])
    expect(data?.recipes).toHaveLength(1)
  })
})
