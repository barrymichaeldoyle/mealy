import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

/**
 * Data access lives behind these hooks so swapping in a cached/offline
 * source later (the first post-MVP milestone) touches one layer.
 */
export function useRecipes() {
  return useQuery(api.recipes.list)
}

export function useRecipe(id: Id<'recipes'> | undefined) {
  return useQuery(api.recipes.get, id ? { id } : 'skip')
}

export function useCreateRecipe() {
  return useMutation(api.recipes.create)
}

export function useUpdateRecipe() {
  return useMutation(api.recipes.update)
}

export function useDeleteRecipe() {
  return useMutation(api.recipes.remove)
}
