import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBasket,
  Trash2,
} from 'lucide-react'
import { AppHeader } from '../../components/app-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Sheet } from '../../components/ui/sheet'
import { Input } from '../../components/ui/field'
import { Skeleton } from '../../components/ui/skeleton'
import { EmptyState } from '../../components/ui/empty-state'
import {
  useAddPlannedMeal,
  usePlannedMeals,
  useRemovePlannedMeal,
  useSetPlannedServings,
} from '../../hooks/use-plan'
import { useRecipes } from '../../hooks/use-recipes'
import { useGenerateListFromPlan } from '../../hooks/use-lists'
import {
  addDays,
  dayMonthLabel,
  isToday,
  startOfWeek,
  weekDates,
  weekRangeLabel,
  weekdayLongLabel,
  type IsoDate,
} from '../../lib/dates'
import { cn } from '../../lib/cn'
import type { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_app/plan')({ component: PlanScreen })

function PlanScreen() {
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [pickerDate, setPickerDate] = useState<IsoDate | null>(null)
  const [generating, setGenerating] = useState(false)

  const days = weekDates(weekStart)
  const start = days[0]
  const end = days[6]

  const meals = usePlannedMeals(start, end)
  const recipes = useRecipes()
  const addMeal = useAddPlannedMeal()
  const setServings = useSetPlannedServings()
  const removeMeal = useRemovePlannedMeal()
  const generateList = useGenerateListFromPlan()

  const mealsByDate = new Map<IsoDate, NonNullable<typeof meals>>()
  for (const meal of meals ?? []) {
    if (meal.slot !== 'dinner') continue // MVP surfaces dinner only
    const existing = mealsByDate.get(meal.date) ?? []
    existing.push(meal)
    mealsByDate.set(meal.date, existing)
  }

  const plannedCount =
    meals?.filter((meal) => meal.slot === 'dinner').length ?? 0

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-stone-900">Plan</h1>
          <Button
            variant="accent"
            disabled={plannedCount === 0 || generating}
            onClick={async () => {
              setGenerating(true)
              try {
                const listId = await generateList({ start, end })
                await navigate({ to: '/lists/$id', params: { id: listId } })
              } finally {
                setGenerating(false)
              }
            }}
          >
            <ShoppingBasket className="size-4" aria-hidden="true" />
            {generating ? 'Generating…' : 'Generate list'}
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-2 py-2 shadow-sm ring-1 ring-stone-200/70">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Previous week"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold text-stone-800">
              {weekRangeLabel(weekStart)}
            </p>
            <button
              type="button"
              className="text-xs font-medium text-emerald-700 hover:underline"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              Jump to this week
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Next week"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </Button>
        </div>

        <ul className="mt-4 space-y-3">
          {days.map((date) => {
            const dayMeals = mealsByDate.get(date) ?? []
            return (
              <li key={date}>
                <Card
                  className={cn(
                    'overflow-hidden',
                    isToday(date) && 'ring-2 ring-emerald-500',
                  )}
                >
                  <div className="flex items-center justify-between bg-stone-50/80 px-4 py-2.5">
                    <h2 className="text-sm font-semibold text-stone-700">
                      {weekdayLongLabel(date)}
                      <span className="ml-2 font-normal text-stone-400">
                        {dayMonthLabel(date)}
                      </span>
                      {isToday(date) && (
                        <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                          Today
                        </span>
                      )}
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Add dinner for ${weekdayLongLabel(date)}`}
                      onClick={() => setPickerDate(date)}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Dinner
                    </Button>
                  </div>

                  {meals === undefined ? (
                    <div className="px-4 py-3">
                      <Skeleton className="h-6 w-2/3" />
                    </div>
                  ) : dayMeals.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-stone-400">
                      Nothing planned yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-stone-100">
                      {dayMeals.map((meal) => (
                        <li
                          key={meal._id}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-stone-800">
                              {meal.recipe?.title ?? 'Deleted recipe'}
                            </p>
                            <p className="text-xs text-stone-500">
                              Serves {meal.servings}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 rounded-xl bg-stone-100 p-0.5">
                            <button
                              type="button"
                              aria-label="Fewer servings"
                              disabled={meal.servings <= 1}
                              onClick={() =>
                                setServings({
                                  id: meal._id,
                                  servings: meal.servings - 1,
                                })
                              }
                              className="rounded-lg p-2 text-stone-600 hover:bg-white disabled:opacity-40"
                            >
                              <Minus className="size-4" aria-hidden="true" />
                            </button>
                            <span className="min-w-5 text-center text-sm font-semibold tabular-nums">
                              {meal.servings}
                            </span>
                            <button
                              type="button"
                              aria-label="More servings"
                              onClick={() =>
                                setServings({
                                  id: meal._id,
                                  servings: meal.servings + 1,
                                })
                              }
                              className="rounded-lg p-2 text-stone-600 hover:bg-white"
                            >
                              <Plus className="size-4" aria-hidden="true" />
                            </button>
                          </div>

                          <button
                            type="button"
                            aria-label={`Remove ${meal.recipe?.title ?? 'meal'}`}
                            onClick={() => removeMeal({ id: meal._id })}
                            className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      </main>

      <RecipePicker
        open={pickerDate !== null}
        date={pickerDate}
        recipes={recipes}
        onClose={() => setPickerDate(null)}
        onPick={async (recipeId) => {
          if (!pickerDate) return
          await addMeal({ date: pickerDate, recipeId })
          setPickerDate(null)
        }}
      />
    </>
  )
}

function RecipePicker({
  open,
  date,
  recipes,
  onClose,
  onPick,
}: {
  open: boolean
  date: IsoDate | null
  recipes: ReturnType<typeof useRecipes>
  onClose: () => void
  onPick: (recipeId: Id<'recipes'>) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = (recipes ?? []).filter((recipe) =>
    recipe.title.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={date ? `Dinner for ${weekdayLongLabel(date)}` : 'Pick a recipe'}
    >
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search recipes"
        aria-label="Search recipes"
      />

      {recipes !== undefined && recipes.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            emoji="🥕"
            title="No recipes yet"
            body="Add a recipe first, then you can plan it in."
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {filtered.map((recipe) => (
            <li key={recipe._id}>
              <button
                type="button"
                onClick={() => onPick(recipe._id)}
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-left hover:border-emerald-400 hover:bg-emerald-50"
              >
                <span className="block font-medium text-stone-800">
                  {recipe.title}
                </span>
                <span className="block text-xs text-stone-500">
                  Serves {recipe.servings}
                  {recipe.tags.length > 0 && ` · ${recipe.tags.join(', ')}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
