import { describe, expect, test } from 'vitest'
import {
  bucketOrder,
  catalogueIndex,
  groupByCategory,
  nextSortOrder,
  preferredStore,
  routeByStore,
} from '../shops'

const WOOLIES = { _id: 'woolies', name: 'Woolworths', sortOrder: 0 }
const CHECKERS = { _id: 'checkers', name: 'Checkers', sortOrder: 10 }
const CLICKS = { _id: 'clicks', name: 'Clicks', sortOrder: 20 }
const STORES = [WOOLIES, CHECKERS, CLICKS]

describe('picking a shop for something sold at several', () => {
  test('takes the one ranked highest', () => {
    expect(preferredStore(['checkers', 'woolies'], STORES)).toBe('woolies')
  })

  test('ignores shops the household has since deleted', () => {
    expect(preferredStore(['gone', 'checkers'], STORES)).toBe('checkers')
  })

  test('is null when nothing sells it', () => {
    expect(preferredStore([], STORES)).toBeNull()
    expect(preferredStore(['gone'], STORES)).toBeNull()
  })
})

describe('routing a shop into lists', () => {
  const catalogue = catalogueIndex([
    { key: 'milk', storeIds: ['woolies', 'checkers'], categoryId: 'dairy' },
    { key: 'chicken thighs', storeIds: ['woolies'] },
    { key: 'tinned tomatoes', storeIds: ['checkers'] },
    { key: 'shampoo', storeIds: ['clicks'] },
  ])

  test('sends each item to the shop that sells it', () => {
    const buckets = routeByStore(
      [
        { name: 'Chicken thighs' },
        { name: 'Tinned tomatoes' },
        { name: 'Shampoo' },
      ],
      catalogue,
      STORES,
    )
    expect(buckets.get('woolies')).toEqual([{ name: 'Chicken thighs' }])
    expect(buckets.get('checkers')).toEqual([{ name: 'Tinned tomatoes' }])
    expect(buckets.get('clicks')).toEqual([{ name: 'Shampoo' }])
  })

  test('puts a thing sold at both on one list, not two', () => {
    const buckets = routeByStore([{ name: 'Milk' }], catalogue, STORES)
    expect([...buckets.keys()]).toEqual(['woolies'])
  })

  test('matches names case and space insensitively', () => {
    const buckets = routeByStore([{ name: '  MILK ' }], catalogue, STORES)
    expect(buckets.get('woolies')).toEqual([{ name: '  MILK ' }])
  })

  test('collects anything unfiled under no shop at all', () => {
    const buckets = routeByStore(
      [{ name: 'Coriander' }, { name: 'Milk' }],
      catalogue,
      STORES,
    )
    expect(buckets.get(null)).toEqual([{ name: 'Coriander' }])
  })

  test('a household with no shops yet gets one list, as before', () => {
    const buckets = routeByStore(
      [{ name: 'Milk' }, { name: 'Coriander' }],
      catalogueIndex([]),
      [],
    )
    expect([...buckets.keys()]).toEqual([null])
    expect(buckets.get(null)).toHaveLength(2)
  })
})

describe('the order the lists come out in', () => {
  test('follows the shop order, with the unfiled pile last', () => {
    expect(bucketOrder(['checkers', null, 'woolies'], STORES)).toEqual([
      'woolies',
      'checkers',
      null,
    ])
  })
})

describe('grouping a list into aisles', () => {
  const categories = [
    { _id: 'dairy', name: 'Dairy', sortOrder: 30 },
    { _id: 'veg', name: 'Fruit & veg', sortOrder: 0 },
  ]

  test('runs in aisle order, not alphabetical', () => {
    const sections = groupByCategory(
      [
        { name: 'Milk', categoryId: 'dairy' },
        { name: 'Onions', categoryId: 'veg' },
      ],
      categories,
    )
    expect(sections.map((section) => section.name)).toEqual([
      'Fruit & veg',
      'Dairy',
    ])
  })

  test('leaves out aisles with nothing in them', () => {
    const sections = groupByCategory(
      [{ name: 'Milk', categoryId: 'dairy' }],
      categories,
    )
    expect(sections).toHaveLength(1)
  })

  test('puts unfiled items last, under one heading', () => {
    const sections = groupByCategory(
      [{ name: 'Milk', categoryId: 'dairy' }, { name: 'Coriander' }],
      categories,
    )
    expect(sections.at(-1)).toMatchObject({
      categoryId: null,
      name: 'Everything else',
      items: [{ name: 'Coriander' }],
    })
  })

  test('an item filed under a deleted aisle reads as unfiled', () => {
    const sections = groupByCategory(
      [{ name: 'Milk', categoryId: 'gone' }],
      categories,
    )
    expect(sections).toEqual([
      {
        categoryId: null,
        name: 'Everything else',
        items: [{ name: 'Milk', categoryId: 'gone' }],
      },
    ])
  })

  test('keeps every item when nothing is filed', () => {
    const sections = groupByCategory(
      [{ name: 'Milk', categoryId: undefined }],
      [],
    )
    expect(sections).toHaveLength(1)
    expect(sections[0]?.items).toHaveLength(1)
  })
})

describe('sort order for a new row', () => {
  test('lands after everything already there', () => {
    expect(nextSortOrder([{ sortOrder: 0 }, { sortOrder: 10 }])).toBe(20)
  })

  test('starts at zero on an empty list', () => {
    expect(nextSortOrder([])).toBe(0)
  })
})
