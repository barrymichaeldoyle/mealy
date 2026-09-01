import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

/**
 * The household's shops and aisles. Both together, because every screen
 * that offers one offers the other: where a thing comes from and where in
 * the shop it sits are the same question asked twice.
 */
export function useShops() {
  return useQuery(api.shops.overview)
}

/** Everything the household has filed, for the screen that corrects it. */
export function useCatalogue() {
  return useQuery(api.shops.catalogue)
}

export function useAddStore() {
  return useMutation(api.shops.addStore)
}

export function useRenameStore() {
  return useMutation(api.shops.renameStore)
}

export function useRemoveStore() {
  return useMutation(api.shops.removeStore)
}

export function useReorderStores() {
  return useMutation(api.shops.reorderStores)
}

export function useAddCategory() {
  return useMutation(api.shops.addCategory)
}

export function useRenameCategory() {
  return useMutation(api.shops.renameCategory)
}

export function useRemoveCategory() {
  return useMutation(api.shops.removeCategory)
}

export function useReorderCategories() {
  return useMutation(api.shops.reorderCategories)
}

/** Where a thing comes from, and which aisle it is in. */
export function useSetPlacement() {
  return useMutation(api.shops.setPlacement)
}

export function useForgetItem() {
  return useMutation(api.shops.forgetItem)
}
