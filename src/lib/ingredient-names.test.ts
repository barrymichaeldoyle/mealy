import { describe, expect, it } from 'vitest'
import {
  ingredientVocabulary,
  looksLikeSameThing,
  similarNameGroups,
  stemKey,
  suggestNames,
} from './ingredient-names'

describe('looksLikeSameThing', () => {
  it('matches a tense apart, which is how the split happens', () => {
    expect(looksLikeSameThing('Roast Veg Pack', 'Roasted Veg Pack')).toBe(true)
  })

  it('matches a plural apart', () => {
    expect(looksLikeSameThing('tin tomato', 'tin tomatoes')).toBe(true)
    expect(looksLikeSameThing('onion', 'onions')).toBe(true)
    expect(looksLikeSameThing('berry', 'berries')).toBe(true)
  })

  it('ignores case, spacing and punctuation', () => {
    expect(
      looksLikeSameThing('self-raising flour', 'Self raising  flour'),
    ).toBe(true)
  })

  /*
   * The failure that matters. A wrong merge is only found in the shop, so
   * an extra word is always a different ingredient.
   */
  it('never matches when a word is added', () => {
    expect(looksLikeSameThing('cream', 'creamed corn')).toBe(false)
    expect(looksLikeSameThing('chicken stock', 'chicken')).toBe(false)
    expect(looksLikeSameThing('roast veg pack', 'roast veg')).toBe(false)
  })

  it('never matches a different word', () => {
    expect(looksLikeSameThing('red pepper', 'green pepper')).toBe(false)
    expect(looksLikeSameThing('smoked paprika', 'smoked salt')).toBe(false)
  })

  it('is not "similar" when it is the same name already', () => {
    expect(looksLikeSameThing('onion', 'Onion ')).toBe(false)
  })

  it('drops word order, since a shopper reads the same shelf', () => {
    expect(stemKey('chicken stock')).toBe(stemKey('stock chicken'))
  })
})

describe('ingredientVocabulary', () => {
  it('counts uses and keeps the spelling used most', () => {
    const vocabulary = ingredientVocabulary([
      { ingredients: [{ name: 'Onion' }, { name: 'flour' }] },
      { ingredients: [{ name: 'onion' }, { name: 'onion' }] },
      { ingredients: [{ name: 'onion' }] },
    ])
    expect(vocabulary).toEqual([
      { name: 'onion', count: 4 },
      { name: 'flour', count: 1 },
    ])
  })

  it('ignores blank names', () => {
    expect(ingredientVocabulary([{ ingredients: [{ name: '  ' }] }])).toEqual(
      [],
    )
  })
})

describe('suggestNames', () => {
  const vocabulary = [
    { name: 'Roast Veg Pack', count: 3 },
    { name: 'roast chicken', count: 2 },
    { name: 'onion', count: 9 },
  ]

  it('offers the name that would otherwise split, ahead of a prefix', () => {
    // "Roasted Veg Pack" shares no prefix with "Roast Veg Pack", so a
    // starts-with search would miss the one suggestion that matters.
    expect(suggestNames(vocabulary, 'Roasted Veg Pack')).toEqual([
      'Roast Veg Pack',
    ])
  })

  it('offers what has been typed so far, most used first', () => {
    expect(suggestNames(vocabulary, 'roast')).toEqual([
      'Roast Veg Pack',
      'roast chicken',
    ])
  })

  it('says nothing for an exact match or an empty field', () => {
    expect(suggestNames(vocabulary, 'onion')).toEqual([])
    expect(suggestNames(vocabulary, '  ')).toEqual([])
  })
})

describe('similarNameGroups', () => {
  it('groups the spellings of one ingredient', () => {
    const groups = similarNameGroups([
      { name: 'Roast Veg Pack' },
      { name: 'onion' },
      { name: 'Roasted Veg Pack' },
      { name: 'creamed corn' },
    ])
    expect(groups).toEqual([
      [{ name: 'Roast Veg Pack' }, { name: 'Roasted Veg Pack' }],
    ])
  })

  it('leaves a list where every name is its own thing alone', () => {
    expect(similarNameGroups([{ name: 'onion' }, { name: 'garlic' }])).toEqual(
      [],
    )
  })
})
