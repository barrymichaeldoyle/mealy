import { describe, expect, test } from 'vitest'
import { convexTest } from 'convex-test'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

const BARRY = { subject: 'user_barry', name: 'Barry' }
const STRANGER = { subject: 'user_stranger', name: 'Stranger' }

function setup() {
  return convexTest(schema, modules)
}

async function listWith(
  as: ReturnType<ReturnType<typeof setup>['withIdentity']>,
  name: string,
  items: string[],
) {
  const listId = await as.mutation(api.lists.create, { name })
  for (const item of items) {
    await as.mutation(api.lists.addItem, { listId, name: item })
  }
  return listId
}

async function namesOn(
  as: ReturnType<ReturnType<typeof setup>['withIdentity']>,
  listId: Awaited<ReturnType<typeof listWith>>,
) {
  const list = await as.query(api.lists.get, { id: listId })
  return list?.items.map((item) => item.name)
}

describe('reordering list items', () => {
  test('keeps the order it was handed', async () => {
    const as = setup().withIdentity(BARRY)
    const listId = await listWith(as, 'Woolworths', ['Bread', 'Eggs', 'Milk'])
    const before = await as.query(api.lists.get, { id: listId })
    const [bread, eggs, milk] = before?.items ?? []
    if (!bread || !eggs || !milk) {
      throw new Error('expected three items')
    }

    await as.mutation(api.lists.reorderItems, {
      listId,
      ids: [milk._id, bread._id, eggs._id],
    })

    expect(await namesOn(as, listId)).toEqual(['Milk', 'Bread', 'Eggs'])
  })

  test('puts something added afterwards at the bottom', async () => {
    const as = setup().withIdentity(BARRY)
    const listId = await listWith(as, 'Woolworths', ['Milk', 'Eggs'])
    const before = await as.query(api.lists.get, { id: listId })
    await as.mutation(api.lists.reorderItems, {
      listId,
      ids: (before?.items ?? []).map((item) => item._id).toReversed(),
    })

    await as.mutation(api.lists.addItem, { listId, name: 'Apples' })

    expect(await namesOn(as, listId)).toEqual(['Milk', 'Eggs', 'Apples'])
  })

  test('survives clearing and putting back', async () => {
    const as = setup().withIdentity(BARRY)
    const listId = await listWith(as, 'Woolworths', ['Bread', 'Milk'])
    const before = await as.query(api.lists.get, { id: listId })
    await as.mutation(api.lists.reorderItems, {
      listId,
      ids: (before?.items ?? []).map((item) => item._id).toReversed(),
    })

    const placed = await as.query(api.lists.get, { id: listId })
    await as.mutation(api.lists.restoreItems, {
      listId,
      items: (placed?.items ?? []).map((item) => ({
        name: `${item.name} again`,
        unit: item.unit,
        checked: false,
        manuallyAdded: true,
        approximate: false,
        sourceRecipeIds: [],
        ...(item.sortOrder === undefined ? {} : { sortOrder: item.sortOrder }),
      })),
    })

    expect(await namesOn(as, listId)).toEqual([
      'Milk',
      'Milk again',
      'Bread',
      'Bread again',
    ])
  })

  test('refuses an item from another list', async () => {
    const as = setup().withIdentity(BARRY)
    const woolies = await listWith(as, 'Woolworths', ['Milk'])
    const clicks = await listWith(as, 'Clicks', ['Shampoo'])
    const other = await as.query(api.lists.get, { id: clicks })
    const shampoo = other?.items[0]
    if (!shampoo) {
      throw new Error('expected an item')
    }

    await expect(
      as.mutation(api.lists.reorderItems, {
        listId: woolies,
        ids: [shampoo._id],
      }),
    ).rejects.toThrow('different list')
  })

  test('refuses another household’s list', async () => {
    const t = setup()
    const barry = t.withIdentity(BARRY)
    const listId = await listWith(barry, 'Woolworths', ['Milk'])
    const mine = await barry.query(api.lists.get, { id: listId })

    await expect(
      t.withIdentity(STRANGER).mutation(api.lists.reorderItems, {
        listId,
        ids: (mine?.items ?? []).map((item) => item._id),
      }),
    ).rejects.toThrow('Not found')
  })
})
