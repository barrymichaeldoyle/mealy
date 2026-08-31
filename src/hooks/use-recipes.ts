import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useAuth } from '@clerk/tanstack-react-start'
import { api } from '../../convex/_generated/api'
import {
  readCachedRecipe,
  readCachedRecipes,
  writeCachedRecipes,
} from '../lib/offline-recipes'
import { ingredientVocabulary, type NameCount } from '../lib/ingredient-names'
import type { Doc, Id } from '../../convex/_generated/dataModel'

/**
 * Data access lives behind these hooks, which is what makes the offline
 * copy one layer rather than a change to every screen.
 *
 * A Convex query is `undefined` while it is in flight and stays there with
 * no connection, so that is the moment the cached book answers instead.
 * `null` means the server answered "no such recipe", which is not something
 * the cache should override.
 */
/**
 * Every ingredient name this household has typed, for the suggestions under
 * the name field. Derived from the recipes already on the client, so it
 * costs no query and works from the offline copy.
 */
export function useIngredientNames(
  /** Names typed into the recipe being written, which is not saved yet. */
  drafted: { name: string }[] = [],
): NameCount[] {
  const recipes = useRecipes() ?? []
  return ingredientVocabulary([...recipes, { ingredients: drafted }])
}

export function useRecipes(): Doc<'recipes'>[] | undefined {
  const { userId } = useAuth()
  const remote = useQuery(api.recipes.list)
  const [cached, setCached] = useState<Doc<'recipes'>[] | undefined>(() =>
    typeof window === 'undefined' || !userId
      ? undefined
      : readCachedRecipes(window.localStorage, userId),
  )

  useEffect(() => {
    if (!userId) {
      setCached(undefined)
      return
    }
    setCached(readCachedRecipes(window.localStorage, userId))
  }, [userId])

  useEffect(() => {
    if (!userId || !remote) {
      return
    }
    writeCachedRecipes(window.localStorage, userId, remote)
    setCached(remote)
  }, [remote, userId])

  return remote === undefined ? cached : remote
}

export function useRecipe(
  id: Id<'recipes'> | undefined,
): Doc<'recipes'> | null | undefined {
  const { userId } = useAuth()
  const remote = useQuery(api.recipes.get, id ? { id } : 'skip')
  const [cached, setCached] = useState<Doc<'recipes'> | undefined>(() =>
    typeof window === 'undefined' || !userId || !id
      ? undefined
      : readCachedRecipe(window.localStorage, userId, id),
  )

  useEffect(() => {
    if (!userId || !id) {
      setCached(undefined)
      return
    }
    setCached(readCachedRecipe(window.localStorage, userId, id))
  }, [id, userId])

  return remote === undefined ? cached : remote
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
