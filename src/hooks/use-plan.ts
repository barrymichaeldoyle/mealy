import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { IsoDate } from '../lib/dates'

export function usePlannedMeals(start: IsoDate, end: IsoDate) {
  return useQuery(api.plans.listRange, { start, end })
}

export function useAddPlannedMeal() {
  return useMutation(api.plans.addMeal)
}

export function useSetPlannedServings() {
  return useMutation(api.plans.setServings)
}

export function useRemovePlannedMeal() {
  return useMutation(api.plans.removeMeal)
}

export function useMovePlannedMeal() {
  return useMutation(api.plans.moveMeal)
}
