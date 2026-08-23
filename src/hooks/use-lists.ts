import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/tanstack-react-start'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useOnlineStatus } from './use-online-status'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import {
  queueToggle,
  readCachedList,
  readPendingToggles,
  removePendingToggle,
  toggleCachedItem,
  writeCachedList,
} from '../lib/offline-lists'

export function useShoppingLists() {
  return useQuery(api.lists.list)
}

export function useShoppingList(id: Id<'shoppingLists'> | undefined) {
  const { userId } = useAuth()
  const remote = useQuery(api.lists.get, id ? { id } : 'skip')
  const [cached, setCached] = useState(() => {
    if (typeof window === 'undefined' || !id || !userId) {
      return undefined
    }
    return readCachedList(window.localStorage, userId, id)
  })

  useEffect(() => {
    if (!id || !userId) {
      setCached(undefined)
      return
    }

    const refresh = () => {
      setCached(readCachedList(window.localStorage, userId, id))
    }
    refresh()
    window.addEventListener('mealy:offline-list-change', refresh)
    return () => {
      window.removeEventListener('mealy:offline-list-change', refresh)
    }
  }, [id, userId])

  useEffect(() => {
    if (!userId || !remote) {
      return
    }
    writeCachedList(window.localStorage, userId, remote)
    setCached(remote)
  }, [remote, userId])

  return remote === undefined ? cached : remote
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

export function useRestoreListItems() {
  return useMutation(api.lists.restoreItems)
}

/**
 * Ticking an item is the single most repeated action in a shop, so it gets
 * an optimistic update: the row flips instantly, before the round trip.
 */
export function useToggleListItem() {
  const { userId } = useAuth()
  const online = useOnlineStatus()
  const mutation = useMutation(api.lists.toggleItem).withOptimisticUpdate(
    (localStore, args) => {
      for (const { args: queryArgs, value } of localStore.getAllQueries(
        api.lists.get,
      )) {
        if (!value) {
          continue
        }
        const items = value.items.map((item: Doc<'shoppingListItems'>) =>
          item._id === args.id ? { ...item, checked: args.checked } : item,
        )
        localStore.setQuery(api.lists.get, queryArgs, { ...value, items })
      }
    },
  )

  useEffect(() => {
    if (!online || !userId) {
      return
    }

    const currentUserId = userId
    let cancelled = false
    async function flush() {
      const toggles = readPendingToggles(window.localStorage, currentUserId)
      const results = await Promise.allSettled(
        toggles.map(async (toggle) => {
          await mutation(toggle)
          return toggle.id
        }),
      )
      if (cancelled) {
        return
      }
      for (const result of results) {
        if (result.status === 'fulfilled') {
          removePendingToggle(window.localStorage, currentUserId, result.value)
        }
      }
    }
    void flush()
    return () => {
      cancelled = true
    }
  }, [mutation, online, userId])

  return async (args: { id: Id<'shoppingListItems'>; checked: boolean }) => {
    if (userId) {
      toggleCachedItem(window.localStorage, userId, args.id, args.checked)
      window.dispatchEvent(new Event('mealy:offline-list-change'))
    }

    if (!online) {
      if (userId) {
        queueToggle(window.localStorage, userId, args)
      }
      return
    }

    try {
      await mutation(args)
      if (userId) {
        removePendingToggle(window.localStorage, userId, args.id)
      }
    } catch (error) {
      if (userId && !navigator.onLine) {
        queueToggle(window.localStorage, userId, args)
        return
      }
      throw error
    }
  }
}
