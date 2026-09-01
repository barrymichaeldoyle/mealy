import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react'
import { AppHeader } from '../../components/app-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Sheet } from '../../components/ui/sheet'
import { Input } from '../../components/ui/field'
import { PageHeader } from '../../components/ui/page-header'
import { Skeleton } from '../../components/ui/skeleton'
import { EmptyState } from '../../components/ui/empty-state'
import { UndoBar } from '../../components/ui/undo-bar'
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
  dayOfMonth,
  isCurrentWeek,
  isToday,
  startOfWeek,
  weekDates,
  weekRangeLabel,
  weekdayLongLabel,
  weekdayShortLabel,
  type IsoDate,
} from '../../lib/dates'
import { cn } from '../../lib/cn'
import type { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_app/plan')({
  component: PlanScreen,
  /*
   * `add` carries a recipe over from its own page, so "add to the plan" ends
   * on a day rather than on a week grid where you have to find it again.
   */
  validateSearch: (search: Record<string, unknown>): { add?: string } =>
    typeof search['add'] === 'string' ? { add: search['add'] } : {},
})

function PlanScreen() {
  const navigate = useNavigate()
  const search = Route.useSearch()
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
  // Everything addMeal needs to put a removed meal back exactly as it was.
  const [undo, setUndo] = useState<{
    title: string
    date: IsoDate
    slot: 'breakfast' | 'lunch' | 'dinner'
    recipeId: Id<'recipes'>
    servings: number
  } | null>(null)

  const mealsByDate = new Map<IsoDate, NonNullable<typeof meals>>()
  for (const meal of meals ?? []) {
    if (meal.slot !== 'dinner') {
      continue
    } // MVP surfaces dinner only
    const existing = mealsByDate.get(meal.date) ?? []
    existing.push(meal)
    mealsByDate.set(meal.date, existing)
  }

  const plannedCount =
    meals?.filter((meal) => meal.slot === 'dinner').length ?? 0

  /*
   * Arrived here to place one recipe. Resolved against the loaded recipes so
   * a stale or foreign id in the URL just leaves the plan as it was.
   */
  const placing = search.add
    ? ((recipes ?? []).find((recipe) => recipe._id === search.add) ?? null)
    : null

  function stopPlacing() {
    return navigate({ to: '/plan', search: {} })
  }

  /** Tapping a day places the carried recipe, or opens the picker. */
  async function chooseDay(date: IsoDate) {
    if (!placing) {
      setPickerDate(date)
      return
    }
    await addMeal({ date, recipeId: placing._id })
    await stopPlacing()
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        <PageHeader
          title="Plan"
          action={
            /* The one loud CTA on this screen. */
            <Button
              variant="accent"
              disabled={plannedCount === 0 || generating}
              onClick={async () => {
                setGenerating(true)
                try {
                  const listIds = await generateList({ start, end })
                  // A week that takes two shops lands on the index, where
                  // both lists are, rather than on whichever came first.
                  await navigate(
                    listIds.length === 1
                      ? { to: '/lists/$id', params: { id: listIds[0]! } }
                      : { to: '/lists' },
                  )
                } finally {
                  setGenerating(false)
                }
              }}
            >
              {generating ? 'Generating…' : 'Generate list'}
            </Button>
          }
        />

        <WeekNav weekStart={weekStart} onChange={setWeekStart} />

        {placing && (
          <output className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-card border border-basil-700 bg-basil-100/50 px-4 py-3">
            <p className="min-w-0 text-body text-ink-900">
              Pick a day for{' '}
              <span className="font-semibold">{placing.title}</span>
            </p>
            <Button variant="ghost" onClick={() => void stopPlacing()}>
              Cancel
            </Button>
          </output>
        )}

        {/*
         * Seven day rows, not a grid. This is a phone: a grid squeezes a
         * recipe title into three characters.
         */}
        <ol className="mt-4">
          {days.map((date) => (
            <li key={date} className="flex gap-3 py-2">
              <DayRail date={date} />
              <div className="min-w-0 flex-1 space-y-2">
                {meals === undefined ? (
                  <Skeleton className="h-[52px] w-full" />
                ) : (mealsByDate.get(date) ?? []).length === 0 ? (
                  <button
                    type="button"
                    onClick={() => void chooseDay(date)}
                    className={cn(
                      'flex min-h-[52px] w-full items-center gap-2 rounded-card',
                      'border border-dashed border-paper-300 px-4',
                      'text-body text-ink-400 transition-colors duration-150',
                      'ease-out hover:border-basil-700 hover:text-basil-700',
                      'focus-visible:outline-2 focus-visible:outline-offset-2',
                      'focus-visible:outline-basil-700',
                    )}
                  >
                    <Plus className="size-4 shrink-0" aria-hidden="true" />
                    {/*
                     * While a recipe is being placed the row says which one.
                     * The banner that explains the mode scrolls away on a
                     * phone, and "Add dinner" then says nothing about what
                     * the tap is about to do.
                     */}
                    <span className="truncate">
                      {placing ? `Add ${placing.title}` : 'Add dinner'}
                    </span>
                    <span className="sr-only">
                      {' '}
                      for {weekdayLongLabel(date)}
                    </span>
                  </button>
                ) : (
                  <>
                    {(mealsByDate.get(date) ?? []).map((meal) => (
                      <MealCard
                        key={meal._id}
                        title={meal.recipe?.title ?? 'Deleted recipe'}
                        servings={meal.servings}
                        {...(meal.recipe ? { recipeId: meal.recipeId } : {})}
                        onServings={(servings) =>
                          setServings({ id: meal._id, servings })
                        }
                        onRemove={async () => {
                          if (meal.recipe) {
                            setUndo({
                              title: meal.recipe.title,
                              date: meal.date as IsoDate,
                              slot: meal.slot,
                              recipeId: meal.recipeId,
                              servings: meal.servings,
                            })
                          }
                          await removeMeal({ id: meal._id })
                        }}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => void chooseDay(date)}
                      className="flex min-h-[44px] items-center rounded-btn px-1 text-meta font-medium text-basil-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700"
                    >
                      {placing ? `Add ${placing.title}` : 'Add another'}
                      <span className="sr-only">
                        {' '}
                        dinner for {weekdayLongLabel(date)}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      </main>

      <RecipePicker
        open={pickerDate !== null}
        date={pickerDate}
        recipes={recipes}
        onClose={() => setPickerDate(null)}
        onPick={async (recipeId) => {
          if (!pickerDate) {
            return
          }
          await addMeal({ date: pickerDate, recipeId })
          setPickerDate(null)
        }}
      />

      {undo && (
        <UndoBar
          message={`Removed ${undo.title}`}
          onDismiss={() => setUndo(null)}
          onUndo={async () => {
            setUndo(null)
            await addMeal({
              date: undo.date,
              slot: undo.slot,
              recipeId: undo.recipeId,
              servings: undo.servings,
            })
          }}
        />
      )}
    </>
  )
}

/**
 * The week header sticks so you always know which week you are editing. The
 * way back only appears once there is somewhere to go back to.
 */
function WeekNav({
  weekStart,
  onChange,
}: {
  weekStart: Date
  onChange: (next: Date) => void
}) {
  const current = isCurrentWeek(weekStart)

  return (
    <div className="sticky top-14 z-10 -mx-4 mt-4 bg-paper-50/95 px-4 py-2 backdrop-blur md:top-0">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          aria-label="Previous week"
          onClick={() => onChange(addDays(weekStart, -7))}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Button>
        <p className="text-title font-semibold text-ink-900 tabular-nums">
          {weekRangeLabel(weekStart)}
        </p>
        <Button
          variant="ghost"
          aria-label="Next week"
          onClick={() => onChange(addDays(weekStart, 7))}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </Button>
      </div>
      {!current && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onChange(startOfWeek(new Date()))}
            className="rounded-btn px-2 py-1 text-meta font-medium text-basil-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700"
          >
            Back to this week
          </button>
        </div>
      )}
    </div>
  )
}

/** The left rail: weekday above the date number, today ringed in basil. */
function DayRail({ date }: { date: IsoDate }) {
  const today = isToday(date)

  return (
    <div className="w-11 shrink-0 pt-1 text-center">
      <p className="text-meta font-semibold tracking-wide text-ink-400 uppercase">
        {weekdayShortLabel(date)}
      </p>
      <p
        className={cn(
          'mx-auto mt-0.5 grid size-8 place-items-center rounded-full',
          'text-title font-semibold tabular-nums',
          today ? 'bg-basil-700 text-paper-50' : 'text-ink-600',
        )}
      >
        {dayOfMonth(date)}
        {today && <span className="sr-only"> (today)</span>}
      </p>
    </div>
  )
}

function MealCard({
  title,
  servings,
  recipeId,
  onServings,
  onRemove,
}: {
  title: string
  servings: number
  onServings: (servings: number) => void
  onRemove: () => void | Promise<void>
  /** Absent when the recipe behind the meal has been deleted. */
  recipeId?: Id<'recipes'> | undefined
}) {
  return (
    /*
     * Two rows on a phone rather than four controls crowded along one edge.
     * These used to be 32px each, under the 44px this design commits to, with
     * the bin one thumb-width from "one more serving".
     */
    <Card className="p-3">
      {/*
       * Through to the recipe, carrying the servings this meal is planned
       * for, so the quantities on the other side are the ones you cook.
       */}
      {recipeId ? (
        <Link
          to="/recipes/$id"
          params={{ id: recipeId }}
          search={{ servings }}
          className="block min-w-0 text-pretty break-words rounded-btn font-serif text-title font-medium text-ink-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700"
        >
          {title}
        </Link>
      ) : (
        <p className="min-w-0 text-pretty break-words font-serif text-title font-medium text-ink-900">
          {title}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-center rounded-btn border border-line bg-paper-50">
          <button
            type="button"
            aria-label={`Fewer servings of ${title}`}
            disabled={servings <= 1}
            onClick={() => onServings(servings - 1)}
            className={STEP}
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          {/* Announced with the stepper buttons, which name the recipe. */}
          <span className="min-w-8 text-center text-body font-semibold text-ink-900 tabular-nums">
            {servings}
          </span>
          <button
            type="button"
            aria-label={`More servings of ${title}`}
            onClick={() => onServings(servings + 1)}
            className={STEP}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Removal is undoable, so it does not need a confirm in the way. */}
        <button
          type="button"
          aria-label={`Remove ${title}`}
          onClick={() => void onRemove()}
          className={cn(
            'flex size-11 items-center justify-center rounded-btn',
            'text-ink-400 transition-colors duration-150 ease-out',
            'hover:bg-paper-200 hover:text-danger-text',
            'focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-basil-700',
          )}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </Card>
  )
}

const STEP = cn(
  'flex size-11 items-center justify-center rounded-btn text-ink-600',
  'transition-colors duration-150 ease-out hover:bg-paper-200',
  'disabled:opacity-40 disabled:hover:bg-transparent',
  'focus-visible:outline-2 focus-visible:-outline-offset-2',
  'focus-visible:outline-basil-700',
)

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
            icon={BookOpen}
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
                className={cn(
                  'w-full rounded-card border border-paper-200 bg-paper-50',
                  'px-4 py-3 text-left transition-colors duration-150 ease-out',
                  'hover:border-basil-700 hover:bg-basil-100',
                  'focus-visible:outline-2 focus-visible:outline-offset-2',
                  'focus-visible:outline-basil-700',
                )}
              >
                <span className="block font-serif text-title font-medium text-ink-900">
                  {recipe.title}
                </span>
                <span className="block text-meta font-medium text-ink-400">
                  serves {recipe.servings}
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
