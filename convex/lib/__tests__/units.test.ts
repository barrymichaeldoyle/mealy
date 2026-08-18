import { describe, expect, it } from 'vitest'
import {
  consolidate,
  formatCanonicalQuantity,
  formatListItem,
  formatRecipeQuantity,
  normalizeName,
  roundCanonical,
  toCanonical,
  unitFamily,
} from '../units'

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
    expect(formatCanonicalQuantity(750, 'ml')).toBe('750ml')
    expect(formatCanonicalQuantity(1000, 'ml')).toBe('1l')
  })

  it('renders counts as multipliers', () => {
    expect(formatCanonicalQuantity(2, 'tin')).toBe('x2')
    expect(formatCanonicalQuantity(3, 'item')).toBe('x3')
  })
})

describe('consolidate', () => {
  it('merges identical mass ingredients exactly', () => {
    const [item] = consolidate([
      { name: 'mince', quantity: 250, unit: 'g' },
      { name: 'Mince', quantity: 250, unit: 'g' },
    ])
    expect(item.name).toBe('mince')
    expect(item.quantity).toBe(500)
    expect(item.unit).toBe('g')
    expect(item.approximate).toBe(false)
    expect(formatListItem({ ...item, unit: 'g' })).toBe('500g')
  })

  it('sums countable units', () => {
    const [item] = consolidate([
      { name: 'tin tomatoes', quantity: 1, unit: 'tin' },
      { name: 'tin tomatoes', quantity: 1, unit: 'tin' },
    ])
    expect(item.quantity).toBe(2)
    expect(item.unit).toBe('tin')
    expect(formatListItem({ ...item, unit: 'tin' })).toBe('x2')
  })

  it('consolidates imperial into metric with an approximate flag', () => {
    // 250g + 8oz (226.8g) = 476.8g → ≈480g
    const [item] = consolidate([
      { name: 'mince', quantity: 250, unit: 'g' },
      { name: 'mince', quantity: 8, unit: 'oz' },
    ])
    expect(item.quantity).toBe(480)
    expect(item.approximate).toBe(true)
    expect(formatListItem({ ...item, unit: 'g' })).toBe('≈480g')
  })

  it('promotes large masses to kg on display', () => {
    const [item] = consolidate([
      { name: 'flour', quantity: 1, unit: 'kg' },
      { name: 'flour', quantity: 500, unit: 'g' },
    ])
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
    expect(items[0].unit).toBe('g')
    expect(items[0].quantity).toBe(200)
    expect(items[1].unit).toBe('ml')
    expect(items[1].quantity).toBe(250)
    expect(items[1].approximate).toBe(true)
  })

  it('does not merge different countable units', () => {
    const items = consolidate([
      { name: 'tomatoes', quantity: 2, unit: 'tin' },
      { name: 'tomatoes', quantity: 1, unit: 'pack' },
    ])
    expect(items).toHaveLength(2)
  })

  it('merges compatible volume units', () => {
    const [item] = consolidate([
      { name: 'milk', quantity: 1, unit: 'l' },
      { name: 'milk', quantity: 500, unit: 'ml' },
      { name: 'milk', quantity: 2, unit: 'tbsp' },
    ])
    // 1000 + 500 + 30 = 1530 → banded to 1500ml
    expect(item.quantity).toBe(1500)
    expect(item.approximate).toBe(true)
    expect(formatListItem({ ...item, unit: 'ml' })).toBe('≈1.5l')
  })

  it('scales by planned servings', () => {
    const [item] = consolidate([
      { name: 'rice', quantity: 200, unit: 'g', scale: 2 },
    ])
    expect(item.quantity).toBe(400)
    expect(item.approximate).toBe(false)
  })

  it('flags rounding introduced by scaling', () => {
    // 200g × (3/2) = 300g — exact, no ≈
    const [exact] = consolidate([
      { name: 'rice', quantity: 200, unit: 'g', scale: 1.5 },
    ])
    expect(exact.quantity).toBe(300)
    expect(exact.approximate).toBe(false)

    // 100g × (1/3) = 33.33g → 33g, rounded
    const [rounded] = consolidate([
      { name: 'rice', quantity: 100, unit: 'g', scale: 1 / 3 },
    ])
    expect(rounded.quantity).toBe(33)
    expect(rounded.approximate).toBe(true)
  })

  it('rounds fractional counts up to whole units', () => {
    const [item] = consolidate([
      { name: 'tin tomatoes', quantity: 1, unit: 'tin', scale: 1.5 },
    ])
    expect(item.quantity).toBe(2)
    expect(item.approximate).toBe(true)
  })

  it('keeps "to taste" ingredients without a quantity', () => {
    const [item] = consolidate([
      { name: 'salt', unit: 'none' },
      { name: 'salt', unit: 'none' },
    ])
    expect(item.quantity).toBeUndefined()
    expect(item.approximate).toBe(false)
    expect(formatListItem({ ...item, unit: 'none' })).toBe('to taste')
  })

  it('tracks source recipes for traceability', () => {
    const [item] = consolidate([
      { name: 'mince', quantity: 250, unit: 'g', recipeId: 'a' },
      { name: 'mince', quantity: 250, unit: 'g', recipeId: 'b' },
      { name: 'mince', quantity: 100, unit: 'g', recipeId: 'a' },
    ])
    expect(item.sourceRecipeIds).toEqual(['a', 'b'])
  })
})

describe('formatRecipeQuantity', () => {
  it('shows units as the author entered them', () => {
    expect(formatRecipeQuantity(250, 'g')).toBe('250g')
    expect(formatRecipeQuantity(1.5, 'cup')).toBe('1.5 cup')
    expect(formatRecipeQuantity(2, 'tin')).toBe('2 tin')
    expect(formatRecipeQuantity(3, 'item')).toBe('3')
    expect(formatRecipeQuantity(undefined, 'none')).toBe('to taste')
  })
})
