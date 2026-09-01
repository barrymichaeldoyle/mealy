import { describe, expect, test } from 'vitest'
import { convexTest } from 'convex-test'
import { api } from '../_generated/api'
import schema from '../schema'
import type { Id } from '../_generated/dataModel'

const modules = import.meta.glob('../**/*.ts')

const BARRY = { subject: 'user_barry', name: 'Barry' }

/**
 * Signed in with a household already made, which is what the app shell's
 * call to `ensureCurrent` does before any screen renders.
 */
async function setup() {
  const as = convexTest(schema, modules).withIdentity(BARRY)
  await as.mutation(api.households.ensureCurrent, {})
  return as
}

/** A household with two food shops and a chemist, in that order. */
async function withShops(as: Awaited<ReturnType<typeof setup>>) {
  return {
    woolies: await as.mutation(api.shops.addStore, { name: 'Woolworths' }),
    checkers: await as.mutation(api.shops.addStore, { name: 'Checkers' }),
    clicks: await as.mutation(api.shops.addStore, { name: 'Clicks' }),
  }
}

async function recipe(
  as: Awaited<ReturnType<typeof setup>>,
  title: string,
  names: string[],
) {
  return await as.mutation(api.recipes.create, {
    title,
    servings: 2,
    tags: [],
    steps: ['Cook it'],
    ingredients: names.map((name) => ({
      name,
      quantity: 1,
      unit: 'item' as const,
    })),
  })
}

describe('a household that has never named a shop', () => {
  test('gets the one list it has always got', async () => {
    const as = await setup()
    const recipeId = await recipe(as, 'Roast', ['Chicken', 'Potatoes'])

    const listIds = await as.mutation(api.lists.generateFromRecipes, {
      recipeIds: [recipeId],
      name: 'Sunday',
    })

    expect(listIds).toHaveLength(1)
    const created = await as.query(api.lists.get, { id: listIds[0]! })
    expect(created?.name).toBe('Sunday')
    expect(created?.storeId).toBeUndefined()
    expect(created?.items).toHaveLength(2)
  })

  test('is given aisles to file things under from the start', async () => {
    const as = await setup()
    const { categories } = await as.query(api.shops.overview, {})
    expect(categories.map((category) => category.name)).toContain('Dairy')
  })
})

describe('generating a shop for a household with shops', () => {
  test('splits into one list per shop, in the order they are shopped', async () => {
    const as = await setup()
    const stores = await withShops(as)
    const { categories } = await as.query(api.shops.overview, {})
    const dairy = categories.find((row) => row.name === 'Dairy')!._id

    await as.mutation(api.shops.setPlacement, {
      name: 'Milk',
      storeIds: [stores.checkers, stores.woolies],
      categoryId: dairy,
    })
    await as.mutation(api.shops.setPlacement, {
      name: 'Tinned tomatoes',
      storeIds: [stores.checkers],
    })

    const recipeId = await recipe(as, 'Pasta', [
      'Milk',
      'Tinned tomatoes',
      'Basil',
    ])
    const listIds = await as.mutation(api.lists.generateFromRecipes, {
      recipeIds: [recipeId],
      name: 'Tuesday',
    })

    const lists = await Promise.all(
      listIds.map((id) => as.query(api.lists.get, { id })),
    )
    expect(lists.map((list) => list?.name)).toEqual([
      'Woolworths, Tuesday',
      'Checkers, Tuesday',
      'Tuesday',
    ])

    // Milk is sold at both and appears once, at the shop ranked higher.
    expect(lists[0]?.items.map((item) => item.name)).toEqual(['Milk'])
    expect(lists[1]?.items.map((item) => item.name)).toEqual([
      'Tinned tomatoes',
    ])
    expect(lists[2]?.items.map((item) => item.name)).toEqual(['Basil'])
  })

  test('carries the aisle onto the row, ready to group by', async () => {
    const as = await setup()
    const stores = await withShops(as)
    const { categories } = await as.query(api.shops.overview, {})
    const dairy = categories.find((row) => row.name === 'Dairy')!._id

    await as.mutation(api.shops.setPlacement, {
      name: 'Milk',
      storeIds: [stores.woolies],
      categoryId: dairy,
    })

    const recipeId = await recipe(as, 'Porridge', ['Milk'])
    const [listId] = await as.mutation(api.lists.generateFromRecipes, {
      recipeIds: [recipeId],
    })

    const created = await as.query(api.lists.get, { id: listId! })
    expect(created?.items[0]?.categoryId).toBe(dairy)
    expect(created?.items[0]?.storeIds).toEqual([stores.woolies])
  })

  test('numbers a second trip to the same shop in the same week', async () => {
    const as = await setup()
    const stores = await withShops(as)
    await as.mutation(api.shops.setPlacement, {
      name: 'Milk',
      storeIds: [stores.woolies],
    })
    const recipeId = await recipe(as, 'Porridge', ['Milk'])

    await as.mutation(api.lists.generateFromRecipes, {
      recipeIds: [recipeId],
      name: 'Tuesday',
    })
    const [again] = await as.mutation(api.lists.generateFromRecipes, {
      recipeIds: [recipeId],
      name: 'Tuesday',
    })

    const created = await as.query(api.lists.get, { id: again! })
    expect(created?.name).toBe('Woolworths, Tuesday (2)')
  })
})

describe('what a list learns while you use it', () => {
  test('adding to a shop list records that the shop sells it', async () => {
    const as = await setup()
    const stores = await withShops(as)
    const listId = await as.mutation(api.lists.create, {
      storeId: stores.clicks,
    })

    await as.mutation(api.lists.addItem, { listId, name: 'Shampoo' })

    const filed = await as.query(api.shops.catalogue, {})
    expect(filed).toMatchObject([
      { name: 'Shampoo', storeIds: [stores.clicks] },
    ])
  })

  test('a shop it is already known at is not added twice', async () => {
    const as = await setup()
    const stores = await withShops(as)
    await as.mutation(api.shops.setPlacement, {
      name: 'Milk',
      storeIds: [stores.woolies, stores.checkers],
    })

    const listId = await as.mutation(api.lists.create, {
      storeId: stores.woolies,
    })
    await as.mutation(api.lists.addItem, { listId, name: 'milk' })

    const filed = await as.query(api.shops.catalogue, {})
    expect(filed[0]?.storeIds).toEqual([stores.woolies, stores.checkers])
  })

  test('a blank list named after nowhere teaches nothing', async () => {
    const as = await setup()
    await withShops(as)
    const listId = await as.mutation(api.lists.create, { name: 'Bits' })

    await as.mutation(api.lists.addItem, { listId, name: 'Sellotape' })

    expect(await as.query(api.shops.catalogue, {})).toEqual([])
  })

  test('filing something moves the rows already on a list', async () => {
    const as = await setup()
    const { categories } = await as.query(api.shops.overview, {})
    const veg = categories.find((row) => row.name === 'Fruit & veg')!._id

    const listId = await as.mutation(api.lists.create, { name: 'Bits' })
    await as.mutation(api.lists.addItem, { listId, name: 'Coriander' })

    await as.mutation(api.shops.setPlacement, {
      name: 'coriander',
      categoryId: veg,
    })

    const created = await as.query(api.lists.get, { id: listId })
    expect(created?.items[0]?.categoryId).toBe(veg)
  })

  test('a new list picks up the aisle without being told again', async () => {
    const as = await setup()
    const { categories } = await as.query(api.shops.overview, {})
    const veg = categories.find((row) => row.name === 'Fruit & veg')!._id
    await as.mutation(api.shops.setPlacement, {
      name: 'Coriander',
      categoryId: veg,
    })

    const listId = await as.mutation(api.lists.create, { name: 'Next week' })
    await as.mutation(api.lists.addItem, { listId, name: 'Coriander' })

    const created = await as.query(api.lists.get, { id: listId })
    expect(created?.items[0]?.categoryId).toBe(veg)
  })
})

describe('deleting a shop or an aisle', () => {
  test('a deleted shop leaves its list behind, shopless', async () => {
    const as = await setup()
    const stores = await withShops(as)
    const listId = await as.mutation(api.lists.create, {
      storeId: stores.clicks,
    })
    await as.mutation(api.lists.addItem, { listId, name: 'Shampoo' })

    await as.mutation(api.shops.removeStore, { id: stores.clicks })

    const created = await as.query(api.lists.get, { id: listId })
    expect(created?.storeId).toBeUndefined()
    expect(created?.items).toHaveLength(1)
    expect((await as.query(api.shops.catalogue, {}))[0]?.storeIds).toEqual([])
  })

  test('a deleted aisle leaves its items unfiled, not orphaned', async () => {
    const as = await setup()
    const { categories } = await as.query(api.shops.overview, {})
    const dairy = categories.find((row) => row.name === 'Dairy')!._id
    const listId = await as.mutation(api.lists.create, { name: 'Bits' })
    await as.mutation(api.lists.addItem, { listId, name: 'Milk' })
    await as.mutation(api.shops.setPlacement, {
      name: 'Milk',
      categoryId: dairy,
    })

    await as.mutation(api.shops.removeCategory, { id: dairy })

    const created = await as.query(api.lists.get, { id: listId })
    expect(created?.items[0]?.categoryId).toBeUndefined()
  })
})

describe('shops belong to one household', () => {
  test('another household cannot file against your shops', async () => {
    const as = await setup()
    const stores = await withShops(as)

    const stranger = convexTest(schema, modules).withIdentity({
      subject: 'user_stranger',
      name: 'Stranger',
    })
    await expect(
      stranger.mutation(api.shops.setPlacement, {
        name: 'Milk',
        storeIds: [stores.woolies as Id<'stores'>],
      }),
    ).rejects.toThrow('Not found')
  })
})
