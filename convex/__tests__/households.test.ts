import { describe, expect, test } from 'vitest'
import { convexTest } from 'convex-test'
import { api } from '../_generated/api'
import schema from '../schema'
import type { Id } from '../_generated/dataModel'

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
    title: 'Bolognese',
    servings: 4,
    tags: ['pasta'],
    ingredients: [{ name: 'mince', quantity: 250, unit: 'g' as const }],
    steps: ['Brown the mince.'],
  })
  await as.mutation(api.plans.addMeal, { date: '2026-08-18', recipeId })
  await as.mutation(api.lists.generateFromRecipes, { recipeIds: [recipeId] })
  return recipeId
}

async function counts(t: ReturnType<typeof setup>, householdId: string) {
  return await t.run(async (ctx) => {
    const of = async (table: 'recipes' | 'plannedMeals' | 'shoppingLists') =>
      (
        await ctx.db
          .query(table)
          .withIndex('by_household', (q) =>
            q.eq('householdId', householdId as Id<'households'>),
          )
          .collect()
      ).length

    return {
      recipes: await of('recipes'),
      plannedMeals: await of('plannedMeals'),
      lists: await of('shoppingLists'),
    }
  })
}

/** Barry with a household and one of everything in it, plus a live invite. */
async function invited() {
  const t = setup()
  await seed(t, BARRY)
  const barryHousehold = (await t
    .withIdentity(BARRY)
    .query(api.households.current))!
  const token = await t
    .withIdentity(BARRY)
    .mutation(api.households.createInvite, {})
  return { t, token, barryHousehold: barryHousehold.household._id }
}

describe('household bootstrap', () => {
  test('a new identity gets a household of one', async () => {
    const t = setup()
    await t.withIdentity(BARRY).mutation(api.households.ensureCurrent, {})

    const current = await t.withIdentity(BARRY).query(api.households.current)
    expect(current?.members).toHaveLength(1)
    expect(current?.members[0]!.name).toBe('Barry')
    expect(current?.role).toBe('owner')
  })

  test('writing twice does not create a second household', async () => {
    const t = setup()
    const as = t.withIdentity(BARRY)
    await as.mutation(api.households.ensureCurrent, {})
    await seed(t, BARRY)

    const households = await t.run((ctx) =>
      ctx.db.query('households').collect(),
    )
    expect(households).toHaveLength(1)
  })

  test('signed out queries see nothing', async () => {
    const t = setup()
    await seed(t, BARRY)
    expect(await t.query(api.recipes.list)).toEqual([])
    expect(await t.query(api.households.current)).toBeNull()
  })

  test('two households cannot see each other', async () => {
    const t = setup()
    const recipeId = await seed(t, BARRY)
    await seed(t, SAM)

    const sams = await t.withIdentity(SAM).query(api.recipes.list)
    expect(sams).toHaveLength(1)
    expect(
      await t.withIdentity(SAM).query(api.recipes.get, { id: recipeId }),
    ).toBeNull()
  })
})

describe('invites', () => {
  test('a new invite retires the previous one', async () => {
    const { t, token } = await invited()
    const replacement = await t
      .withIdentity(BARRY)
      .mutation(api.households.createInvite, {})

    expect(replacement).not.toBe(token)
    const stale = await t
      .withIdentity(SAM)
      .query(api.households.invite, { token })
    expect(stale?.status).toBe('unknown')
  })

  test('a link works once', async () => {
    const { t, token } = await invited()
    await t
      .withIdentity(SAM)
      .mutation(api.households.acceptInvite, { token, moveData: false })

    const third = { subject: 'user_third', name: 'Third' }
    await expect(
      t
        .withIdentity(third)
        .mutation(api.households.acceptInvite, { token, moveData: false }),
    ).rejects.toThrow('used')
  })

  test('an expired link is refused', async () => {
    const { t, token } = await invited()
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query('householdInvites')
        .withIndex('by_token', (q) => q.eq('token', token))
        .unique()
      await ctx.db.patch(row!._id, { expiresAt: Date.now() - 1 })
    })

    expect(
      (await t.withIdentity(SAM).query(api.households.invite, { token }))
        ?.status,
    ).toBe('expired')
    await expect(
      t
        .withIdentity(SAM)
        .mutation(api.households.acceptInvite, { token, moveData: false }),
    ).rejects.toThrow('expired')
  })

  test('your own invite tells you so instead of offering a join', async () => {
    const { t, token } = await invited()
    const preview = await t
      .withIdentity(BARRY)
      .query(api.households.invite, { token })
    expect(preview?.status).toBe('own-household')
  })

  test('revoking kills the live link', async () => {
    const { t, token } = await invited()
    await t.withIdentity(BARRY).mutation(api.households.revokeInvite, {})

    const preview = await t
      .withIdentity(SAM)
      .query(api.households.invite, { token })
    expect(preview?.status).toBe('unknown')
  })
})

describe('joining', () => {
  test('moveData brings everything across and drops the old household', async () => {
    const { t, token, barryHousehold } = await invited()
    await seed(t, SAM)
    const samHousehold = (await t
      .withIdentity(SAM)
      .query(api.households.current))!.household._id

    await t
      .withIdentity(SAM)
      .mutation(api.households.acceptInvite, { token, moveData: true })

    expect(await counts(t, barryHousehold)).toEqual({
      recipes: 2,
      plannedMeals: 2,
      lists: 2,
    })
    expect(await t.run((ctx) => ctx.db.get(samHousehold))).toBeNull()
    expect(await t.withIdentity(SAM).query(api.recipes.list)).toHaveLength(2)
  })

  test('list items travel with their list', async () => {
    const { t, token, barryHousehold } = await invited()
    await seed(t, SAM)
    await t
      .withIdentity(SAM)
      .mutation(api.households.acceptInvite, { token, moveData: true })

    const strays = await t.run(async (ctx) => {
      const items = await ctx.db.query('shoppingListItems').collect()
      return items.filter((item) => item.householdId !== barryHousehold)
    })
    expect(strays).toEqual([])
  })

  test('starting fresh discards your data and leaves theirs alone', async () => {
    const { t, token, barryHousehold } = await invited()
    await seed(t, SAM)

    await t
      .withIdentity(SAM)
      .mutation(api.households.acceptInvite, { token, moveData: false })

    expect(await counts(t, barryHousehold)).toEqual({
      recipes: 1,
      plannedMeals: 1,
      lists: 1,
    })
    expect(
      await t.run((ctx) => ctx.db.query('recipes').collect()),
    ).toHaveLength(1)
  })

  test('data shared with someone else cannot be taken along', async () => {
    // Sam joins Barry, so their data is shared. A third household then
    // invites Sam, who no longer owns the recipes alone.
    const { t, token } = await invited()
    await t
      .withIdentity(SAM)
      .mutation(api.households.acceptInvite, { token, moveData: true })

    const third = { subject: 'user_third', name: 'Third' }
    await t.withIdentity(third).mutation(api.households.ensureCurrent, {})
    const secondToken = await t
      .withIdentity(third)
      .mutation(api.households.createInvite, {})

    const preview = await t
      .withIdentity(SAM)
      .query(api.households.invite, { token: secondToken })
    expect(preview?.mine?.canMove).toBe(false)

    await expect(
      t.withIdentity(SAM).mutation(api.households.acceptInvite, {
        token: secondToken,
        moveData: true,
      }),
    ).rejects.toThrow('shared')
  })

  test('joining twice is a no-op, not a second membership', async () => {
    const { t, token, barryHousehold } = await invited()
    await t
      .withIdentity(SAM)
      .mutation(api.households.acceptInvite, { token, moveData: false })
    await t
      .withIdentity(SAM)
      .mutation(api.households.acceptInvite, { token, moveData: false })

    const current = await t.withIdentity(SAM).query(api.households.current)
    expect(current?.household._id).toBe(barryHousehold)
    expect(current?.members).toHaveLength(2)
  })
})

describe('leaving and removing', () => {
  test('leaving a household of one is refused', async () => {
    const t = setup()
    await seed(t, BARRY)
    await expect(
      t.withIdentity(BARRY).mutation(api.households.leave, {}),
    ).rejects.toThrow('only member')
  })

  test('leaving keeps the data with the people still there', async () => {
    const { t, token, barryHousehold } = await invited()
    await t
      .withIdentity(SAM)
      .mutation(api.households.acceptInvite, { token, moveData: false })

    await t.withIdentity(SAM).mutation(api.households.leave, {})

    expect(await counts(t, barryHousehold)).toEqual({
      recipes: 1,
      plannedMeals: 1,
      lists: 1,
    })
    expect(await t.withIdentity(SAM).query(api.recipes.list)).toEqual([])
    expect(await t.withIdentity(BARRY).query(api.recipes.list)).toHaveLength(1)
  })

  test('the owner can remove a member, who then has nothing here', async () => {
    const { t, token } = await invited()
    await t
      .withIdentity(SAM)
      .mutation(api.households.acceptInvite, { token, moveData: false })

    const sam = (await t
      .withIdentity(BARRY)
      .query(api.households.current))!.members.find(
      (member) => member.userId === SAM.subject,
    )!

    await t
      .withIdentity(BARRY)
      .mutation(api.households.removeMember, { memberId: sam._id })

    expect(await t.withIdentity(SAM).query(api.households.current)).toBeNull()
    expect(await t.withIdentity(SAM).query(api.recipes.list)).toEqual([])
  })

  test('a member cannot remove the owner', async () => {
    const { t, token } = await invited()
    await t
      .withIdentity(SAM)
      .mutation(api.households.acceptInvite, { token, moveData: false })

    const barry = (await t
      .withIdentity(SAM)
      .query(api.households.current))!.members.find(
      (member) => member.userId === BARRY.subject,
    )!

    await expect(
      t
        .withIdentity(SAM)
        .mutation(api.households.removeMember, { memberId: barry._id }),
    ).rejects.toThrow('owner')
  })

  test('the owner cannot remove themselves', async () => {
    const { t, token } = await invited()
    await t
      .withIdentity(SAM)
      .mutation(api.households.acceptInvite, { token, moveData: false })

    const barry = (await t
      .withIdentity(BARRY)
      .query(api.households.current))!.members.find(
      (member) => member.userId === BARRY.subject,
    )!

    await expect(
      t
        .withIdentity(BARRY)
        .mutation(api.households.removeMember, { memberId: barry._id }),
    ).rejects.toThrow('yourself')
  })
})
