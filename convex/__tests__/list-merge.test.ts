import { describe, expect, test } from 'vitest'
import { convexTest } from 'convex-test'
import { api } from '../_generated/api'
import schema from '../schema'
import type { Id } from '../_generated/dataModel'

const modules = import.meta.glob('../**/*.ts')

const BARRY = { subject: 'user_barry', name: 'Barry' }

function setup() {
  return convexTest(schema, modules)
}

/** A named list with the given hand-added items on it. */
async function listWith(
  as: ReturnType<ReturnType<typeof setup>['withIdentity']>,
  items: { name: string; quantity?: number; unit?: 'g' | 'pack' | 'none' }[],
) {
  const listId = await as.mutation(api.lists.create, { name: 'Woolworths' })
  for (const item of items) {
    await as.mutation(api.lists.addItem, {
      listId,
      name: item.name,
      ...(item.quantity === undefined ? {} : { quantity: item.quantity }),
      unit: item.unit ?? 'none',
    })
  }
  return listId
}

describe('merging two names for one ingredient', () => {
  test('adds the amounts up under the settled name', async () => {
    const t = setup()
    const as = t.withIdentity(BARRY)
    const listId = await listWith(as, [
      { name: 'Roast Veg Pack', quantity: 200, unit: 'g' },
      { name: 'Roasted Veg Pack', quantity: 300, unit: 'g' },
    ])

    const before = await as.query(api.lists.get, { id: listId })
    await as.mutation(api.lists.mergeItems, {
      ids: before!.items.map((item) => item._id),
    })

    const after = await as.query(api.lists.get, { id: listId })
    expect(after!.items).toHaveLength(1)
    expect(after!.items[0]!.quantity).toBe(500)
    // Neither row came from a recipe, so the tie breaks on the name.
    expect(after!.items[0]!.name).toBe('Roast Veg Pack')
  })

  test('keeps a mass and a count apart, under the one name', async () => {
    const t = setup()
    const as = t.withIdentity(BARRY)
    const listId = await listWith(as, [
      { name: 'Roast Veg Pack', quantity: 200, unit: 'g' },
      { name: 'Roasted Veg Pack', quantity: 2, unit: 'pack' },
    ])

    const before = await as.query(api.lists.get, { id: listId })
    await as.mutation(api.lists.mergeItems, {
      ids: before!.items.map((item) => item._id),
    })

    const after = await as.query(api.lists.get, { id: listId })
    // 200g and 2 packs are not 202 of anything, so they stay two lines.
    expect(after!.items).toHaveLength(2)
    expect(after!.items.map((item) => item.name)).toEqual([
      'Roast Veg Pack',
      'Roast Veg Pack',
    ])
  })

  test('leaves the merged row outstanding unless both were in the basket', async () => {
    const t = setup()
    const as = t.withIdentity(BARRY)
    const listId = await listWith(as, [
      { name: 'onion', quantity: 2, unit: 'g' },
      { name: 'onions', quantity: 3, unit: 'g' },
    ])

    const before = await as.query(api.lists.get, { id: listId })
    await as.mutation(api.lists.toggleItem, {
      id: before!.items[0]!._id,
      checked: true,
    })
    await as.mutation(api.lists.mergeItems, {
      ids: before!.items.map((item) => item._id),
    })

    const after = await as.query(api.lists.get, { id: listId })
    expect(after!.items).toHaveLength(1)
    expect(after!.items[0]!.checked).toBe(false)
  })

  test('refuses items on another household’s list', async () => {
    const t = setup()
    const mine = t.withIdentity(BARRY)
    const theirs = t.withIdentity({ subject: 'user_sam', name: 'Sam' })

    const myList = await listWith(mine, [{ name: 'onion' }, { name: 'onions' }])
    const items = (await mine.query(api.lists.get, { id: myList }))!.items

    await expect(
      theirs.mutation(api.lists.mergeItems, {
        ids: items.map((item) => item._id) as Id<'shoppingListItems'>[],
      }),
    ).rejects.toThrow('Not found')
  })

  test('refuses a single item', async () => {
    const t = setup()
    const as = t.withIdentity(BARRY)
    const listId = await listWith(as, [{ name: 'onion' }])
    const items = (await as.query(api.lists.get, { id: listId }))!.items

    await expect(
      as.mutation(api.lists.mergeItems, { ids: [items[0]!._id] }),
    ).rejects.toThrow('Merging needs two items or more')
  })
})
