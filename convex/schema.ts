import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const unitValidator = v.union(
  v.literal('g'),
  v.literal('kg'),
  v.literal('oz'),
  v.literal('lb'),
  v.literal('ml'),
  v.literal('l'),
  v.literal('tsp'),
  v.literal('tbsp'),
  v.literal('cup'),
  v.literal('fl oz'),
  v.literal('pint'),
  v.literal('item'),
  v.literal('tin'),
  v.literal('pack'),
  v.literal('none'),
)

export const unitSystemValidator = v.union(
  v.literal('metric'),
  v.literal('imperial'),
)

export const slotValidator = v.union(
  v.literal('breakfast'),
  v.literal('lunch'),
  v.literal('dinner'),
)

export const ingredientValidator = v.object({
  name: v.string(),
  quantity: v.optional(v.number()),
  unit: unitValidator,
  note: v.optional(v.string()),
})

export default defineSchema({
  /**
   * A household is the unit of ownership: every recipe, plan and list belongs
   * to one, and every member of that household sees the same data. Everyone
   * gets a household of one on first sign-in, so there is no unowned state.
   */
  households: defineTable({
    name: v.string(),
    createdAt: v.number(),
    /**
     * Which measurement systems the recipe form offers. Absent means nobody
     * has answered yet, which is what puts the setup screen in front of them.
     * Kept in step with `units` below, and still the answered-or-not flag.
     */
    unitSystems: v.optional(v.array(unitSystemValidator)),
    /**
     * The units themselves, which is what the pickers and the restated
     * amounts actually read. A system is a preset that fills this in, so a
     * kitchen can keep grams and pints and drop the rest. Absent on
     * households that answered before the granular choice existed: they fall
     * back to everything their systems offer.
     */
    units: v.optional(v.array(unitValidator)),
  }),

  householdMembers: defineTable({
    householdId: v.id('households'),
    userId: v.string(), // Clerk subject
    name: v.string(), // display name, captured when they join
    role: v.union(v.literal('owner'), v.literal('member')),
    joinedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_household', ['householdId']),

  /** One invite link, single use, with an expiry. */
  householdInvites: defineTable({
    householdId: v.id('households'),
    token: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    acceptedBy: v.optional(v.string()),
    acceptedAt: v.optional(v.number()),
  })
    .index('by_token', ['token'])
    .index('by_household', ['householdId'])
    // Account deletion has to reach invites this user made for a household
    // they have since left, which by_household no longer finds.
    .index('by_creator', ['createdBy']),

  recipes: defineTable({
    householdId: v.id('households'),
    title: v.string(),
    description: v.optional(v.string()),
    servings: v.number(),
    prepTimeMinutes: v.optional(v.number()),
    cookTimeMinutes: v.optional(v.number()),
    tags: v.array(v.string()),
    ingredients: v.array(ingredientValidator),
    steps: v.array(v.string()),
  }).index('by_household', ['householdId']),

  plannedMeals: defineTable({
    householdId: v.id('households'),
    date: v.string(), // "YYYY-MM-DD"
    slot: slotValidator, // MVP UI surfaces "dinner" only
    recipeId: v.id('recipes'),
    servings: v.number(),
  })
    .index('by_household', ['householdId'])
    .index('by_household_and_date', ['householdId', 'date']),

  /**
   * Where you can buy a thing, in the order you would rather buy it. A
   * household writes its own: Woolworths and Checkers for food, Clicks for
   * the toiletries, whatever the shops near you are actually called.
   */
  stores: defineTable({
    householdId: v.id('households'),
    name: v.string(),
    /**
     * Lower sorts first, and it decides more than display order: an item
     * sold at two shops is put on the list for whichever of them you ranked
     * higher.
     */
    sortOrder: v.number(),
  }).index('by_household', ['householdId']),

  /**
   * The parts of a shop you walk through: fruit & veg, dairy, frozen. Seeded
   * on the first shop so nobody starts at an empty screen, then reordered to
   * match the store people actually walk around.
   */
  categories: defineTable({
    householdId: v.id('households'),
    name: v.string(),
    sortOrder: v.number(),
  }).index('by_household', ['householdId']),

  /**
   * What the household knows about a thing it buys, kept apart from any one
   * list so the answer survives the shop it was given in. Say once that milk
   * is dairy and sold at both shops, and every list built after that puts it
   * in the right place on its own.
   */
  groceryItems: defineTable({
    householdId: v.id('households'),
    /** As last typed, which is what the catalogue screen shows. */
    name: v.string(),
    /** `normalizeName(name)`, which is what lookups match on. */
    key: v.string(),
    storeIds: v.array(v.id('stores')),
    categoryId: v.optional(v.id('categories')),
  })
    .index('by_household', ['householdId'])
    .index('by_household_and_key', ['householdId', 'key']),

  shoppingLists: defineTable({
    householdId: v.id('households'),
    name: v.string(),
    createdAt: v.number(),
    /**
     * The shop this list is for. Absent on a list for no shop in
     * particular, which is where items with no known store land.
     */
    storeId: v.optional(v.id('stores')),
  }).index('by_household', ['householdId']),

  shoppingListItems: defineTable({
    householdId: v.id('households'),
    listId: v.id('shoppingLists'),
    name: v.string(),
    // Canonical metric (g / ml) or a whole count, matching `unit`.
    quantity: v.optional(v.number()),
    unit: unitValidator,
    checked: v.boolean(),
    /**
     * Who ticked it, as a Clerk subject. Two people in the same shop watch
     * rows flip under their thumbs, and "did you get the milk" is the
     * question that follows. Cleared when a row is unticked.
     */
    checkedBy: v.optional(v.string()),
    manuallyAdded: v.boolean(),
    approximate: v.boolean(),
    sourceRecipeIds: v.array(v.id('recipes')),
    /**
     * Copied from the catalogue when the row is written, so a list renders
     * grouped without reading the catalogue, and so the offline copy in a
     * shop with no signal still knows which aisle to send you to.
     */
    categoryId: v.optional(v.id('categories')),
  })
    .index('by_household', ['householdId'])
    .index('by_list', ['listId']),
})
