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
  recipes: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    servings: v.number(),
    prepTimeMinutes: v.optional(v.number()),
    cookTimeMinutes: v.optional(v.number()),
    tags: v.array(v.string()),
    ingredients: v.array(ingredientValidator),
    steps: v.array(v.string()),
  }).index('by_user', ['userId']),

  plannedMeals: defineTable({
    userId: v.string(),
    date: v.string(), // "YYYY-MM-DD"
    slot: slotValidator, // MVP UI surfaces "dinner" only
    recipeId: v.id('recipes'),
    servings: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_date', ['userId', 'date']),

  shoppingLists: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  shoppingListItems: defineTable({
    userId: v.string(),
    listId: v.id('shoppingLists'),
    name: v.string(),
    // Canonical metric (g / ml) or a whole count, matching `unit`.
    quantity: v.optional(v.number()),
    unit: unitValidator,
    checked: v.boolean(),
    manuallyAdded: v.boolean(),
    approximate: v.boolean(),
    sourceRecipeIds: v.array(v.id('recipes')),
  })
    .index('by_user', ['userId'])
    .index('by_list', ['listId']),
})
