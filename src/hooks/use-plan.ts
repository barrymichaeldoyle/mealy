import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { IsoDate } from '../lib/dates'

export function usePlannedMeals(start: IsoDate, end: IsoDate) {
  return useQuery(api.plans.listRange, { start, end })
}

export function useAddPlannedMeal() {
  return useMutation(api.plans.addMeal)
}

/**
 * The stepper reads the current value to compute the next one, so without an
 * optimistic update every tap inside one round trip resolves to the same
 * target and the extra taps are lost.
 */
export function useSetPlannedServings() {
  return useMutation(api.plans.setServings).withOptimisticUpdate(
    (localStore, args) => {
      for (const { args: queryArgs, value } of localStore.getAllQueries(
        api.plans.listRange,
      )) {
        if (!value) {
          continue
        }
        localStore.setQuery(
          api.plans.listRange,
          queryArgs,
          value.map((meal) =>
            meal._id === args.id ? { ...meal, servings: args.servings } : meal,
          ),
        )
      }
    },
  )
}

export function useRemovePlannedMeal() {
  return useMutation(api.plans.removeMeal)
}
