import { describe, expect, it } from 'vitest'
import {
  UNITS,
  consolidate,
  defaultUnitFor,
  formatEquivalent,
  formatCanonicalQuantity,
  formatListItem,
  formatRecipeQuantity,
  normalizeName,
  roundCanonical,
  toCanonical,
  unitFamily,
  unitForAmount,
  unitsForChoice,
  unitsForSystems,
  systemsForUnits,
  type Unit,
} from '../units'

/** Return an indexed item or fail the test with a useful bounds error. */
function at<T>(items: T[], index: number): T {
  const item = items[index]
  if (item === undefined) {
    throw new Error(`Expected item ${index}, received ${items.length}`)
  }
  return item
}

function single<T>(items: T[]): T {
  expect(items).toHaveLength(1)
  return at(items, 0)
}

describe('toCanonical', () => {
  it('converts mass to grams', () => {
    expect(toCanonical(1, 'kg').quantity).toBe(1000)
    expect(toCanonical(2, 'g').quantity).toBe(2)
    expect(toCanonical(1, 'lb').quantity).toBeCloseTo(453.6)
  })

  it('converts volume to millilitres', () => {
    expect(toCanonical(1, 'l').quantity).toBe(1000)
    expect(toCanonical(3, 'tsp').quantity).toBe(15)
    expect(toCanonical(2, 'tbsp').quantity).toBe(30)
    expect(toCanonical(1, 'cup').quantity).toBe(250)
    expect(toCanonical(1, 'pint').quantity).toBe(473)
  })

  it('flags approximate conversion constants', () => {
    expect(toCanonical(1, 'oz').approximate).toBe(true)
    expect(toCanonical(1, 'lb').approximate).toBe(true)
    expect(toCanonical(1, 'fl oz').approximate).toBe(true)
    expect(toCanonical(1, 'cup').approximate).toBe(true)
    expect(toCanonical(1, 'g').approximate).toBe(false)
    expect(toCanonical(1, 'kg').approximate).toBe(false)
    expect(toCanonical(1, 'tbsp').approximate).toBe(false)
  })

  it('keeps counts as their own family', () => {
    expect(unitFamily('tin')).toBe('count:tin')
    expect(unitFamily('pack')).toBe('count:pack')
    expect(unitFamily('item')).toBe('count:item')
    expect(unitFamily('none')).toBe('none')
  })
})

describe('normalizeName', () => {
  it('is case and whitespace insensitive', () => {
    expect(normalizeName('  Tin Tomatoes ')).toBe('tin tomatoes')
    expect(normalizeName('tin   tomatoes')).toBe('tin tomatoes')
  })
})

describe('roundCanonical', () => {
  it('rounds into shopper-friendly bands', () => {
    expect(roundCanonical(476.8)).toBe(480)
    expect(roundCanonical(500)).toBe(500)
    expect(roundCanonical(12.4)).toBe(12)
    expect(roundCanonical(1560)).toBe(1600)
    expect(roundCanonical(1500)).toBe(1500)
    expect(roundCanonical(2.55)).toBeCloseTo(2.6)
  })
})

describe('formatCanonicalQuantity', () => {
  it('promotes to kg and l above 1000', () => {
    expect(formatCanonicalQuantity(500, 'g')).toBe('500g')
    expect(formatCanonicalQuantity(1500, 'g')).toBe('1.5kg')
    expect(formatCanonicalQuantity(2000, 'g')).toBe('2kg')
    expect(formatCanonicalQuantity(750, 'ml')).toBe('750mℓ')
    expect(formatCanonicalQuantity(1000, 'ml')).toBe('1ℓ')
  })

  it('renders counts as multipliers', () => {
    expect(formatCanonicalQuantity(2, 'tin')).toBe('x2')
    expect(formatCanonicalQuantity(3, 'item')).toBe('x3')
    expect(formatCanonicalQuantity(1, 'tin')).toBe('1')
    expect(formatCanonicalQuantity(1, 'item')).toBe('1')
  })
})

describe('consolidate', () => {
  it('merges identical mass ingredients exactly', () => {
    const item = single(
      consolidate([
        { name: 'mince', quantity: 250, unit: 'g' },
        { name: 'Mince', quantity: 250, unit: 'g' },
      ]),
    )
    expect(item.name).toBe('mince')
    expect(item.quantity).toBe(500)
    expect(item.unit).toBe('g')
    expect(item.approximate).toBe(false)
    expect(formatListItem({ ...item, unit: 'g' })).toBe('500g')
  })

  it('sums countable units', () => {
    const item = single(
      consolidate([
        { name: 'tin tomatoes', quantity: 1, unit: 'tin' },
        { name: 'tin tomatoes', quantity: 1, unit: 'tin' },
      ]),
    )
    expect(item.quantity).toBe(2)
    expect(item.unit).toBe('tin')
    expect(formatListItem({ ...item, unit: 'tin' })).toBe('x2')
  })

  it('consolidates imperial into metric with an approximate flag', () => {
    // 250g + 8oz (226.8g) = 476.8g → ≈480g
    const item = single(
      consolidate([
        { name: 'mince', quantity: 250, unit: 'g' },
        { name: 'mince', quantity: 8, unit: 'oz' },
      ]),
    )
    expect(item.quantity).toBe(480)
    expect(item.approximate).toBe(true)
    expect(formatListItem({ ...item, unit: 'g' })).toBe('≈480g')
  })

  it('promotes large masses to kg on display', () => {
    const item = single(
      consolidate([
        { name: 'flour', quantity: 1, unit: 'kg' },
        { name: 'flour', quantity: 500, unit: 'g' },
      ]),
    )
    expect(item.quantity).toBe(1500)
    expect(item.approximate).toBe(false)
    expect(formatListItem({ ...item, unit: 'g' })).toBe('1.5kg')
  })

  it('never converts between volume and mass', () => {
    const items = consolidate([
      { name: 'flour', quantity: 200, unit: 'g' },
      { name: 'flour', quantity: 1, unit: 'cup' },
    ])
    expect(items).toHaveLength(2)
    expect(items[0]?.unit).toBe('g')
    expect(items[0]?.quantity).toBe(200)
    expect(items[1]?.unit).toBe('ml')
    expect(items[1]?.quantity).toBe(250)
    expect(items[1]?.approximate).toBe(true)
  })

  it('does not merge different countable units', () => {
    const items = consolidate([
      { name: 'tomatoes', quantity: 2, unit: 'tin' },
      { name: 'tomatoes', quantity: 1, unit: 'pack' },
    ])
    expect(items).toHaveLength(2)
  })

  it('merges compatible volume units', () => {
    const item = single(
      consolidate([
        { name: 'milk', quantity: 1, unit: 'l' },
        { name: 'milk', quantity: 500, unit: 'ml' },
        { name: 'milk', quantity: 2, unit: 'tbsp' },
      ]),
    )
    // 1000 + 500 + 30 = 1530 → banded to 1500ml
    expect(item.quantity).toBe(1500)
    expect(item.approximate).toBe(true)
    expect(formatListItem({ ...item, unit: 'ml' })).toBe('≈1.5ℓ')
  })

  it('scales by planned servings', () => {
    const item = single(
      consolidate([{ name: 'rice', quantity: 200, unit: 'g', scale: 2 }]),
    )
    expect(item.quantity).toBe(400)
    expect(item.approximate).toBe(false)
  })

  it('flags rounding introduced by scaling', () => {
    // 200g × (3/2) = 300g exactly, no ≈
    const exact = single(
      consolidate([{ name: 'rice', quantity: 200, unit: 'g', scale: 1.5 }]),
    )
    expect(exact.quantity).toBe(300)
    expect(exact.approximate).toBe(false)

    // 100g × (1/3) = 33.33g → 33g, rounded
    const rounded = single(
      consolidate([{ name: 'rice', quantity: 100, unit: 'g', scale: 1 / 3 }]),
    )
    expect(rounded.quantity).toBe(33)
    expect(rounded.approximate).toBe(true)
  })

  it('rounds fractional counts up to whole units', () => {
    const item = single(
      consolidate([
        { name: 'tin tomatoes', quantity: 1, unit: 'tin', scale: 1.5 },
      ]),
    )
    expect(item.quantity).toBe(2)
    expect(item.approximate).toBe(true)
  })

  it('keeps "to taste" ingredients without a quantity', () => {
    const item = single(
      consolidate([
        { name: 'salt', unit: 'none' },
        { name: 'salt', unit: 'none' },
      ]),
    )
    expect(item.quantity).toBeUndefined()
    expect(item.approximate).toBe(false)
    expect(formatListItem({ ...item, unit: 'none' })).toBe('to taste')
  })

  it('leaves a hand-added item with no amount blank, not "to taste"', () => {
    expect(
      formatListItem({
        name: 'dish soap',
        unit: 'none',
        approximate: false,
        manuallyAdded: true,
      }),
    ).toBe('')
  })

  it('leaves a measured ingredient with no quantity blank', () => {
    const item = single(
      consolidate([{ name: 'chicken breasts', unit: 'item' }]),
    )
    expect(item.quantity).toBeUndefined()
    expect(formatListItem(item)).toBe('')
    expect(
      formatListItem({
        name: 'flour',
        unit: 'g',
        approximate: false,
      }),
    ).toBe('')
  })

  it('tracks source recipes for traceability', () => {
    const item = single(
      consolidate([
        { name: 'mince', quantity: 250, unit: 'g', recipeId: 'a' },
        { name: 'mince', quantity: 250, unit: 'g', recipeId: 'b' },
        { name: 'mince', quantity: 100, unit: 'g', recipeId: 'a' },
      ]),
    )
    expect(item.sourceRecipeIds).toEqual(['a', 'b'])
  })
})

describe('unitForAmount', () => {
  it('reads a bare number as a count', () => {
    expect(unitForAmount(2, 'none')).toBe('item')
  })

  it('leaves a chosen unit alone', () => {
    expect(unitForAmount(2, 'g')).toBe('g')
    expect(unitForAmount(2, 'tin')).toBe('tin')
  })

  it('leaves "to taste" alone when there is no number', () => {
    expect(unitForAmount(undefined, 'none')).toBe('none')
  })
})

describe('formatRecipeQuantity', () => {
  it('shows units as the author entered them', () => {
    expect(formatRecipeQuantity(250, 'g')).toBe('250g')
    // Display only: the stored unit is still 'ml'.
    expect(formatRecipeQuantity(500, 'ml')).toBe('500mℓ')
    expect(formatRecipeQuantity(1, 'l')).toBe('1ℓ')
    expect(formatRecipeQuantity(1.5, 'cup')).toBe('1.5 cup')
    expect(formatRecipeQuantity(2, 'tin')).toBe('2 tin')
    expect(formatRecipeQuantity(3, 'item')).toBe('3')
    expect(formatRecipeQuantity(undefined, 'none')).toBe('to taste')
  })

  it('says nothing when a measured ingredient has no quantity', () => {
    expect(formatRecipeQuantity(undefined, 'item')).toBe('')
    expect(formatRecipeQuantity(undefined, 'g')).toBe('')
  })
})

describe('unitsForSystems', () => {
  it('offers metric and the shared spoons, but nothing imperial', () => {
    const units = unitsForSystems(['metric'])
    expect(units).toEqual([
      'g',
      'kg',
      'ml',
      'l',
      'tsp',
      'tbsp',
      'cup',
      'item',
      'tin',
      'pack',
      'none',
    ])
  })

  it('offers imperial and the same shared spoons', () => {
    const units = unitsForSystems(['imperial'])
    expect(units).toEqual([
      'oz',
      'lb',
      'tsp',
      'tbsp',
      'cup',
      'fl oz',
      'pint',
      'item',
      'tin',
      'pack',
      'none',
    ])
  })

  it('offers everything when both are on', () => {
    expect(unitsForSystems(['metric', 'imperial'])).toEqual([...UNITS])
  })

  it('keeps a unit a saved recipe already uses', () => {
    const units = unitsForSystems(['metric'], ['lb'])
    expect(units).toContain('lb')
    expect(units).not.toContain('oz')
    // Canonical order, not appended at the end.
    expect(units.indexOf('lb')).toBeLessThan(units.indexOf('ml'))
  })

  it('does not repeat a kept unit that is already offered', () => {
    const units = unitsForSystems(['metric'], ['g', 'g'])
    expect(units.filter((unit) => unit === 'g')).toHaveLength(1)
  })
})

describe('defaultUnitFor', () => {
  it('starts a metric kitchen on grams and an imperial one on ounces', () => {
    expect(defaultUnitFor(unitsForSystems(['metric']))).toBe('g')
    expect(defaultUnitFor(unitsForSystems(['metric', 'imperial']))).toBe('g')
    expect(defaultUnitFor(unitsForSystems(['imperial']))).toBe('oz')
  })

  it('falls to whatever is left when the usual openers are off', () => {
    expect(defaultUnitFor(['kg', 'l'])).toBe('kg')
    // Nothing but counts chosen, which the picker still has to start on.
    expect(defaultUnitFor([])).toBe('item')
  })
})

describe('unitsForChoice', () => {
  it('offers exactly what was chosen, plus the counts nobody chooses', () => {
    expect(unitsForChoice(['g', 'pint'])).toEqual([
      'g',
      'pint',
      'item',
      'tin',
      'pack',
      'none',
    ])
  })

  it('keeps a unit a saved row still uses', () => {
    expect(unitsForChoice(['g'], ['lb'])).toContain('lb')
  })
})

describe('systemsForUnits', () => {
  it('reads the systems back off a granular choice', () => {
    expect(systemsForUnits(['g', 'kg'])).toEqual(['metric'])
    expect(systemsForUnits(['oz', 'pint'])).toEqual(['imperial'])
    expect(systemsForUnits(['g', 'pint'])).toEqual(['metric', 'imperial'])
  })

  it('keeps the default when only the shared units are chosen', () => {
    // Cups and spoons sit in both systems, so they cast no vote.
    expect(systemsForUnits(['cup', 'tsp'])).toEqual(['metric'])
  })
})

describe('formatEquivalent', () => {
  const metric = unitsForSystems(['metric'])
  const imperial = unitsForSystems(['imperial'])

  it('restates spoons and cups in metric', () => {
    expect(formatEquivalent(1, 'tbsp', metric)).toBe('15mℓ')
    expect(formatEquivalent(2, 'tsp', metric)).toBe('10mℓ')
    // The cup is an agreed 250ml, so the answer hedges.
    expect(formatEquivalent(2, 'cup', metric)).toBe('≈500mℓ')
  })

  it('restates an imported imperial amount in metric', () => {
    expect(formatEquivalent(8, 'oz', metric)).toBe('≈226.8g')
    expect(formatEquivalent(1, 'pint', metric)).toBe('≈473mℓ')
  })

  it('restates spoons and cups in imperial, promoting to lb and pints', () => {
    expect(formatEquivalent(2, 'cup', imperial)).toBe('≈1.1 pint')
    expect(formatEquivalent(1, 'tbsp', imperial)).toBe('≈0.5 fl oz')
    expect(formatEquivalent(1, 'kg', imperial)).toBe('≈2.2lb')
    expect(formatEquivalent(100, 'g', imperial)).toBe('≈3.5oz')
  })

  it('says nothing when the unit already is one of theirs', () => {
    expect(formatEquivalent(250, 'g', metric)).toBeNull()
    expect(formatEquivalent(1, 'l', metric)).toBeNull()
    expect(formatEquivalent(8, 'oz', imperial)).toBeNull()
    expect(formatEquivalent(1, 'pint', imperial)).toBeNull()
  })

  it('says nothing for counts or a missing amount', () => {
    expect(formatEquivalent(2, 'tin', metric)).toBeNull()
    expect(formatEquivalent(1, 'none', metric)).toBeNull()
    expect(formatEquivalent(undefined, 'cup', metric)).toBeNull()
  })

  /*
   * The point of choosing units one by one. A kitchen that keeps grams but
   * drops kilograms is not a thing anyone wants, but a kitchen that keeps
   * grams and pints is, and both halves have to read right.
   */
  it('restates a unit switched off inside a system that is otherwise on', () => {
    const noKilos: Unit[] = ['g', 'ml', 'l', 'tsp', 'tbsp']
    expect(formatEquivalent(2, 'kg', noKilos)).toBe('2kg')
    expect(formatEquivalent(200, 'g', noKilos)).toBeNull()
  })

  it('follows the family, so weight and volume can disagree', () => {
    const gramsAndPints: Unit[] = ['g', 'kg', 'pint', 'fl oz']
    // Weight is metric here, so an ounce comes back in grams.
    expect(formatEquivalent(8, 'oz', gramsAndPints)).toBe('≈226.8g')
    // Volume is imperial, so millilitres come back in pints.
    expect(formatEquivalent(500, 'ml', gramsAndPints)).toBe('≈1.1 pint')
  })

  it('restates spoons and cups even when they are chosen', () => {
    // "2 cups" says nothing about how much to buy, whoever ticked it.
    expect(formatEquivalent(2, 'cup', [...metric, 'cup'])).toBe('≈500mℓ')
  })
})
