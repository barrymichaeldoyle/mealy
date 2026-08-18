/**
 * Units, conversions and shopping-list consolidation.
 *
 * Pure module — no Convex, React or DOM dependencies — so it is shared by
 * Convex mutations (list generation) and the client (display formatting)
 * and can be unit tested in isolation.
 *
 * Canonical storage is metric: mass in grams, volume in millilitres.
 * Volume and mass are never converted into one another (density dependent).
 */

export const UNITS = [
  'g',
  'kg',
  'oz',
  'lb',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'fl oz',
  'pint',
  'item',
  'tin',
  'pack',
  'none',
] as const

export type Unit = (typeof UNITS)[number]

export type CanonicalUnit = Extract<
  Unit,
  'g' | 'ml' | 'item' | 'tin' | 'pack' | 'none'
>

/**
 * Two ingredients only merge when their unit families match. Countable units
 * each form their own family — 2 tins and 1 pack are not 3 of anything.
 */
export type UnitFamily =
  | 'mass'
  | 'volume'
  | 'count:item'
  | 'count:tin'
  | 'count:pack'
  | 'none'

/** Multiplier from the given unit to its canonical unit. */
const TO_CANONICAL: Record<Unit, number> = {
  g: 1,
  kg: 1000,
  oz: 28.35,
  lb: 453.6,
  ml: 1,
  l: 1000,
  tsp: 5,
  tbsp: 15,
  cup: 250,
  'fl oz': 29.57,
  pint: 473,
  item: 1,
  tin: 1,
  pack: 1,
  none: 1,
}

/**
 * Units whose canonical factor is an agreed approximation rather than an
 * exact definition. Anything derived from these is displayed with "≈".
 * The metric cup (250ml) is included: it stands in for the US 240ml cup.
 */
const APPROXIMATE_UNITS = new Set<Unit>(['oz', 'lb', 'fl oz', 'pint', 'cup'])

const UNIT_FAMILY: Record<Unit, UnitFamily> = {
  g: 'mass',
  kg: 'mass',
  oz: 'mass',
  lb: 'mass',
  ml: 'volume',
  l: 'volume',
  tsp: 'volume',
  tbsp: 'volume',
  cup: 'volume',
  'fl oz': 'volume',
  pint: 'volume',
  item: 'count:item',
  tin: 'count:tin',
  pack: 'count:pack',
  none: 'none',
}

const FAMILY_CANONICAL_UNIT: Record<UnitFamily, CanonicalUnit> = {
  mass: 'g',
  volume: 'ml',
  'count:item': 'item',
  'count:tin': 'tin',
  'count:pack': 'pack',
  none: 'none',
}

/** Labels used when echoing a unit back to the user in a recipe. */
export const UNIT_LABELS: Record<Unit, string> = {
  g: 'g',
  kg: 'kg',
  oz: 'oz',
  lb: 'lb',
  ml: 'ml',
  l: 'l',
  tsp: 'tsp',
  tbsp: 'tbsp',
  cup: 'cup',
  'fl oz': 'fl oz',
  pint: 'pint',
  item: '',
  tin: 'tin',
  pack: 'pack',
  none: '',
}

export function isUnit(value: string): value is Unit {
  return (UNITS as readonly string[]).includes(value)
}

export function unitFamily(unit: Unit): UnitFamily {
  return UNIT_FAMILY[unit]
}

export function isCountFamily(family: UnitFamily): boolean {
  return family.startsWith('count:')
}

export function canonicalUnitFor(family: UnitFamily): CanonicalUnit {
  return FAMILY_CANONICAL_UNIT[family]
}

export type CanonicalQuantity = {
  quantity: number
  unit: CanonicalUnit
  family: UnitFamily
  /** The conversion used an approximate constant. */
  approximate: boolean
}

/** Convert a user-entered quantity into its canonical metric equivalent. */
export function toCanonical(quantity: number, unit: Unit): CanonicalQuantity {
  const family = unitFamily(unit)
  return {
    quantity: quantity * TO_CANONICAL[unit],
    unit: canonicalUnitFor(family),
    family,
    approximate: APPROXIMATE_UNITS.has(unit),
  }
}

/** Names merge case-insensitively, ignoring surrounding and repeated space. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

const EPSILON = 1e-9

/**
 * Round a canonical (g/ml) amount to a value a shopper can actually act on.
 * Bands widen as the amount grows: 477g → 480g, 1560g → 1600g (1.6kg).
 */
export function roundCanonical(quantity: number): number {
  const step =
    quantity >= 1000 ? 100 : quantity >= 100 ? 10 : quantity >= 10 ? 1 : 0.1
  // Re-fix the division before rounding: 2.55 / 0.1 is 25.499999… in binary
  // floating point, which would otherwise round down to 2.5.
  const steps = Math.round(Number((quantity / step).toFixed(6)))
  return Number((steps * step).toFixed(6))
}

function isRounded(exact: number, rounded: number): boolean {
  return Math.abs(exact - rounded) > EPSILON
}

/** Drop trailing zeros: 1.5 → "1.5", 2.0 → "2". */
function formatNumber(value: number, maxDecimals: number): string {
  return String(Number(value.toFixed(maxDecimals)))
}

/**
 * Render a canonical quantity for a shopping list, promoting to kg/l once
 * the amount is large enough to read better that way.
 */
export function formatCanonicalQuantity(
  quantity: number,
  unit: CanonicalUnit,
): string {
  switch (unit) {
    case 'g':
      return quantity >= 1000
        ? `${formatNumber(quantity / 1000, 1)}kg`
        : `${formatNumber(quantity, 1)}g`
    case 'ml':
      return quantity >= 1000
        ? `${formatNumber(quantity / 1000, 1)}l`
        : `${formatNumber(quantity, 1)}ml`
    case 'item':
      return `x${formatNumber(quantity, 2)}`
    case 'tin':
    case 'pack':
      return `x${formatNumber(quantity, 2)}`
    case 'none':
      return ''
  }
}

export type ShoppingListItemLike = {
  name: string
  quantity?: number
  unit: Unit
  approximate: boolean
}

/**
 * Full display string for a shopping list line, e.g.
 * "mince — ≈480g", "tin tomatoes x2", "salt — to taste".
 */
export function formatListItem(item: ShoppingListItemLike): string {
  const family = unitFamily(item.unit)
  if (family === 'none' || item.quantity === undefined) {
    return 'to taste'
  }
  const amount = formatCanonicalQuantity(
    item.quantity,
    canonicalUnitFor(family),
  )
  if (!amount) return 'to taste'
  return item.approximate ? `≈${amount}` : amount
}

/** Render a quantity the way the recipe author entered it. */
export function formatRecipeQuantity(
  quantity: number | undefined,
  unit: Unit,
): string {
  if (quantity === undefined) return 'to taste'
  const label = UNIT_LABELS[unit]
  const amount = formatNumber(quantity, 2)
  if (!label) return amount
  // Spaced for word-like units, tight for metric symbols.
  return unit === 'g' || unit === 'kg' || unit === 'ml' || unit === 'l'
    ? `${amount}${label}`
    : `${amount} ${label}`
}

export type ConsolidationInput = {
  name: string
  quantity?: number
  unit: Unit
  note?: string
  /** Multiplier from planned servings ÷ recipe servings. */
  scale?: number
  recipeId?: string
}

export type ConsolidatedItem = {
  /** Display name, taken from the first occurrence (original casing). */
  name: string
  /** Canonical metric amount, rounded for display. Absent for "to taste". */
  quantity?: number
  unit: CanonicalUnit
  approximate: boolean
  sourceRecipeIds: string[]
}

/**
 * Merge ingredients into shopping list lines.
 *
 * Ingredients merge when their normalized name AND unit family match.
 * Incompatible families for the same name (200g flour + 1 cup flour) stay as
 * separate lines — volume and mass are never guessed at.
 */
export function consolidate(inputs: ConsolidationInput[]): ConsolidatedItem[] {
  type Bucket = {
    name: string
    family: UnitFamily
    exactQuantity: number
    hasQuantity: boolean
    approximate: boolean
    sourceRecipeIds: string[]
  }

  const buckets = new Map<string, Bucket>()

  for (const input of inputs) {
    const family = unitFamily(input.unit)
    const key = `${normalizeName(input.name)}|${family}`
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        name: input.name.trim(),
        family,
        exactQuantity: 0,
        hasQuantity: false,
        approximate: false,
        sourceRecipeIds: [],
      }
      buckets.set(key, bucket)
    }

    if (input.recipeId && !bucket.sourceRecipeIds.includes(input.recipeId)) {
      bucket.sourceRecipeIds.push(input.recipeId)
    }

    if (input.quantity === undefined || family === 'none') continue

    const scale = input.scale ?? 1
    const canonical = toCanonical(input.quantity * scale, input.unit)
    bucket.exactQuantity += canonical.quantity
    bucket.hasQuantity = true
    if (canonical.approximate) bucket.approximate = true
  }

  return [...buckets.values()].map((bucket) => {
    if (!bucket.hasQuantity) {
      return {
        name: bucket.name,
        unit: canonicalUnitFor(bucket.family),
        approximate: false,
        sourceRecipeIds: bucket.sourceRecipeIds,
      }
    }

    // Counts stay whole — you cannot buy 1.5 tins.
    const rounded = isCountFamily(bucket.family)
      ? Math.ceil(bucket.exactQuantity - EPSILON)
      : roundCanonical(bucket.exactQuantity)

    return {
      name: bucket.name,
      quantity: Number(rounded.toFixed(4)),
      unit: canonicalUnitFor(bucket.family),
      approximate:
        bucket.approximate || isRounded(bucket.exactQuantity, rounded),
      sourceRecipeIds: bucket.sourceRecipeIds,
    }
  })
}
