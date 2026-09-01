/**
 * Units, conversions and shopping-list consolidation.
 *
 * Pure module with no Convex, React or DOM dependencies, so it is shared by
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
 * each form their own family. 2 tins and 1 pack are not 3 of anything.
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

/**
 * Labels used when echoing a unit back to the user in a recipe.
 *
 * Litres are the cursive ℓ (U+2113), which is how South Africa writes them,
 * on packaging and in schools alike. It is display only: the stored unit is
 * still 'l', so an export reads as the SI symbol everyone else expects.
 */
export const UNIT_LABELS: Record<Unit, string> = {
  g: 'g',
  kg: 'kg',
  oz: 'oz',
  lb: 'lb',
  ml: 'mℓ',
  l: 'ℓ',
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
        ? `${formatNumber(quantity / 1000, 1)}ℓ`
        : `${formatNumber(quantity, 1)}mℓ`
    case 'item':
    case 'tin':
    case 'pack':
      // "x2" reads as a multiplier, which only says anything above one.
      return quantity === 1
        ? formatNumber(quantity, 2)
        : `x${formatNumber(quantity, 2)}`
    case 'none':
      return ''
  }
}

export type ShoppingListItemLike = {
  name: string
  quantity?: number | undefined
  unit: Unit
  approximate: boolean
  manuallyAdded?: boolean | undefined
}

/**
 * Full display string for a shopping list line, e.g.
 * "mince: ≈480g", "tin tomatoes x2", "salt: to taste".
 *
 * "to taste" is a measurement the cook picked, not something we say about
 * every blank quantity. Two chicken breasts entered without the two are
 * still chicken breasts, so an amountless line of any other unit says
 * nothing at all. Nobody buys dish soap to taste either, so a hand-added
 * item stays blank whatever its unit.
 */
export function formatListItem(item: ShoppingListItemLike): string {
  const family = unitFamily(item.unit)
  if (family === 'none') {
    return item.manuallyAdded ? '' : 'to taste'
  }
  if (item.quantity === undefined) {
    return ''
  }
  const amount = formatCanonicalQuantity(
    item.quantity,
    canonicalUnitFor(family),
  )
  return item.approximate ? `≈${amount}` : amount
}

/**
 * The unit to store beside a hand-typed amount.
 *
 * "no amount" is the resting state of the unit picker, so someone adding
 * two steaks to a list types the 2 and never touches it. A number against
 * no unit is a count, and storing it as one keeps the 2 instead of
 * dropping it on the floor.
 */
export function unitForAmount(quantity: number | undefined, unit: Unit): Unit {
  return quantity !== undefined && unit === 'none' ? 'item' : unit
}

/** Render a quantity the way the recipe author entered it. */
export function formatRecipeQuantity(
  quantity: number | undefined,
  unit: Unit,
): string {
  if (unit === 'none') {
    return 'to taste'
  }
  if (quantity === undefined) {
    return ''
  }
  const label = UNIT_LABELS[unit]
  const amount = formatNumber(quantity, 2)
  if (!label) {
    return amount
  }
  // Spaced for word-like units, tight for metric symbols.
  return unit === 'g' || unit === 'kg' || unit === 'ml' || unit === 'l'
    ? `${amount}${label}`
    : `${amount} ${label}`
}

export type ConsolidationInput = {
  name: string
  quantity?: number | undefined
  unit: Unit
  note?: string | undefined
  /** Multiplier from planned servings ÷ recipe servings. */
  scale?: number | undefined
  recipeId?: string | undefined
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
 * separate lines. Volume and mass are never guessed at.
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

    if (input.quantity === undefined || family === 'none') {
      continue
    }

    const scale = input.scale ?? 1
    const canonical = toCanonical(input.quantity * scale, input.unit)
    bucket.exactQuantity += canonical.quantity
    bucket.hasQuantity = true
    if (canonical.approximate) {
      bucket.approximate = true
    }
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

    // Counts stay whole: you cannot buy 1.5 tins.
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

export const UNIT_SYSTEMS = ['metric', 'imperial'] as const

export type UnitSystem = (typeof UNIT_SYSTEMS)[number]

/**
 * Which systems offer a unit in the recipe form. Spoons and cups sit in
 * both: a metric kitchen still measures baking powder in teaspoons. Counts
 * and "to taste" belong to no system and are always offered.
 */
const SYSTEMS_BY_UNIT: Record<Unit, readonly UnitSystem[]> = {
  g: ['metric'],
  kg: ['metric'],
  ml: ['metric'],
  l: ['metric'],
  oz: ['imperial'],
  lb: ['imperial'],
  'fl oz': ['imperial'],
  pint: ['imperial'],
  tsp: ['metric', 'imperial'],
  tbsp: ['metric', 'imperial'],
  cup: ['metric', 'imperial'],
  item: [],
  tin: [],
  pack: [],
  none: [],
}

/** What a household gets before anyone has answered the setup question. */
export const DEFAULT_UNIT_SYSTEMS: readonly UnitSystem[] = ['metric']

export const UNIT_SYSTEM_LABELS: Record<UnitSystem, string> = {
  metric: 'Metric',
  imperial: 'Imperial and US',
}

/** The units each system contributes, for the setup screen to show. */
export const UNIT_SYSTEM_UNITS: Record<UnitSystem, readonly Unit[]> = {
  metric: UNITS.filter((unit) => SYSTEMS_BY_UNIT[unit].includes('metric')),
  imperial: UNITS.filter((unit) => SYSTEMS_BY_UNIT[unit].includes('imperial')),
}

/**
 * How the granular picker lays the units out. Derived from the families
 * rather than listed again, so a new unit cannot go missing from the screen
 * that turns it on.
 */
export const UNIT_GROUPS: { label: string; units: Unit[] }[] = [
  {
    label: 'Weight',
    units: UNITS.filter((unit) => unitFamily(unit) === 'mass'),
  },
  {
    label: 'Volume',
    units: UNITS.filter((unit) => unitFamily(unit) === 'volume'),
  },
]

/** Offered whatever the household picked. */
export const UNIVERSAL_UNITS: readonly Unit[] = UNITS.filter(
  (unit) => SYSTEMS_BY_UNIT[unit].length === 0,
)

/**
 * Labels for a unit picker. `UNIT_LABELS` renders nothing for a bare count,
 * which is right beside a number and useless in a dropdown.
 */
export const UNIT_OPTION_LABELS: Record<Unit, string> = {
  ...UNIT_LABELS,
  item: 'item(s)',
  tin: 'tin(s)',
  pack: 'pack(s)',
  none: 'to taste',
}

export function isUnitSystem(value: string): value is UnitSystem {
  return (UNIT_SYSTEMS as readonly string[]).includes(value)
}

/**
 * The units to offer in a picker, in canonical order.
 *
 * `keep` holds units already saved on the row being edited. A recipe written
 * in ounces stays editable after the household turns imperial off, rather
 * than silently changing what it says.
 */
export function unitsForSystems(
  systems: readonly UnitSystem[],
  keep: readonly Unit[] = [],
): Unit[] {
  return UNITS.filter(
    (unit) =>
      SYSTEMS_BY_UNIT[unit].length === 0 ||
      SYSTEMS_BY_UNIT[unit].some((system) => systems.includes(system)) ||
      keep.includes(unit),
  )
}

/** Counts and "to taste": offered whatever the household picked. */
export function isUniversalUnit(unit: Unit): boolean {
  return SYSTEMS_BY_UNIT[unit].length === 0
}

/**
 * The systems a set of units stands for, so the preset tick-boxes and the
 * answered-or-not flag stay in step with a granular choice. Units that sit
 * in both systems do not vote: a kitchen of nothing but cups and spoons has
 * said nothing either way, so it keeps the default.
 */
export function systemsForUnits(units: readonly Unit[]): UnitSystem[] {
  const voted = UNIT_SYSTEMS.filter((system) =>
    units.some((unit) => exclusiveSystem(unit) === system),
  )
  return voted.length > 0 ? voted : [...DEFAULT_UNIT_SYSTEMS]
}

/**
 * The units a picker offers, given the ones the household has chosen.
 *
 * Counts and "to taste" are always in, since they belong to no system.
 * `keep` holds units already saved on the row being edited, so a recipe
 * written in ounces stays editable after ounces are switched off.
 */
export function unitsForChoice(
  chosen: readonly Unit[],
  keep: readonly Unit[] = [],
): Unit[] {
  return UNITS.filter(
    (unit) =>
      SYSTEMS_BY_UNIT[unit].length === 0 ||
      chosen.includes(unit) ||
      keep.includes(unit),
  )
}

/** The unit a fresh ingredient row starts on. */
export function defaultUnitFor(chosen: readonly Unit[]): Unit {
  return (
    (['g', 'oz', 'ml', 'fl oz'] as const).find((unit) =>
      chosen.includes(unit),
    ) ??
    chosen.find((unit) => SYSTEMS_BY_UNIT[unit].length > 0) ??
    'item'
  )
}

/** The system a unit belongs to alone, or null when it sits in both. */
function exclusiveSystem(unit: Unit): UnitSystem | null {
  const owners = SYSTEMS_BY_UNIT[unit]
  return owners.length === 1 ? (owners[0] ?? null) : null
}

/**
 * Which system to restate an amount in, for one family of units.
 *
 * A kitchen can be split: grams for weight, pints for milk. So the family is
 * asked first, and only falls back to the rest of the kitchen when nothing
 * in that family says either way. Spoons and cups never decide it, since
 * they sit in both systems.
 */
function targetSystemFor(
  chosen: readonly Unit[],
  family: UnitFamily,
): UnitSystem {
  const inFamily = new Set(
    chosen.filter((unit) => unitFamily(unit) === family).map(exclusiveSystem),
  )
  if (inFamily.has('metric')) {
    return 'metric'
  }
  if (inFamily.has('imperial')) {
    return 'imperial'
  }
  const overall = new Set(chosen.map(exclusiveSystem))
  return overall.has('imperial') && !overall.has('metric')
    ? 'imperial'
    : 'metric'
}

/** Render a canonical amount in imperial units, promoting oz to lb, fl oz to pints. */
function formatImperial(quantity: number, unit: CanonicalUnit): string {
  switch (unit) {
    case 'g':
      return quantity >= TO_CANONICAL.lb
        ? `${formatNumber(quantity / TO_CANONICAL.lb, 1)}lb`
        : `${formatNumber(quantity / TO_CANONICAL.oz, 1)}oz`
    case 'ml':
      return quantity >= TO_CANONICAL.pint
        ? `${formatNumber(quantity / TO_CANONICAL.pint, 1)} pint`
        : `${formatNumber(quantity / TO_CANONICAL['fl oz'], 1)} fl oz`
    default:
      return ''
  }
}

/**
 * Spoons and cups get restated whatever the household picked: "2 cups" says
 * nothing about how much to buy, and a spoon is a spoon in both systems.
 */
const ALWAYS_RESTATED = new Set<Unit>(['tsp', 'tbsp', 'cup'])

/**
 * The same amount said again in the household's own units, or null when the
 * recipe already reads in one of them.
 *
 * This is what makes a granular choice worth making. Untick pints and every
 * pint you meet from then on carries millilitres beside it.
 */
export function formatEquivalent(
  quantity: number | undefined,
  unit: Unit,
  chosen: readonly Unit[],
): string | null {
  const family = unitFamily(unit)
  if (quantity === undefined || family === 'none' || isCountFamily(family)) {
    return null
  }

  if (chosen.includes(unit) && !ALWAYS_RESTATED.has(unit)) {
    return null
  }

  const target = targetSystemFor(chosen, family)
  const canonical = toCanonical(quantity, unit)
  const amount =
    target === 'metric'
      ? formatCanonicalQuantity(canonical.quantity, canonical.unit)
      : formatImperial(canonical.quantity, canonical.unit)
  if (!amount) {
    return null
  }
  // Every imperial constant here is an approximation, so those always hedge.
  return canonical.approximate || target === 'imperial' ? `≈${amount}` : amount
}
