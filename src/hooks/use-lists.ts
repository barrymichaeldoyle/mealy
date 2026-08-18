import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'

export function useShoppingLists() {
  return useQuery(api.lists.list)
}

export function useShoppingList(id: Id<'shoppingLists'> | undefined) {
  return useQuery(api.lists.get, id ? { id } : 'skip')
}

export function useGenerateListFromPlan() {
  return useMutation(api.lists.generateFromPlan)
}

export function useGenerateListFromRecipes() {
  return useMutation(api.lists.generateFromRecipes)
}

export function useDeleteList() {
  return useMutation(api.lists.remove)
}

export function useAddListItem() {
  return useMutation(api.lists.addItem)
}

export function useUpdateListItem() {
  return useMutation(api.lists.updateItem)
}

export function useRemoveListItem() {
  return useMutation(api.lists.removeItem)
}

export function useClearChecked() {
  return useMutation(api.lists.clearChecked)
}

/**
 * Ticking an item is the single most repeated action in a shop, so it gets
 * an optimistic update: the row flips instantly, before the round trip.
 */
export function useToggleListItem() {
  return useMutation(api.lists.toggleItem).withOptimisticUpdate(
    (localStore, args) => {
      for (const { args: queryArgs, value } of localStore.getAllQueries(
        api.lists.get,
      )) {
        if (!value) continue
        const items = value.items.map((item: Doc<'shoppingListItems'>) =>
          item._id === args.id ? { ...item, checked: args.checked } : item,
        )
        localStore.setQuery(api.lists.get, queryArgs, { ...value, items })
      }
    },
  )
}
