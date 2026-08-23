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
     */
    unitSystems: v.optional(v.array(unitSystemValidator)),
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

  shoppingLists: defineTable({
    householdId: v.id('households'),
    name: v.string(),
    createdAt: v.number(),
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
  })
    .index('by_household', ['householdId'])
    .index('by_list', ['listId']),
})
