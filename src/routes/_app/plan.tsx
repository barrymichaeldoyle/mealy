import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
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
    if (meal.slot !== 'dinner') {
      continue
    } // MVP surfaces dinner only
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
                  const listId = await generateList({ start, end })
                  await navigate({ to: '/lists/$id', params: { id: listId } })
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
                    onClick={() => setPickerDate(date)}
                    className={cn(
                      'flex min-h-[52px] w-full items-center gap-2 rounded-card',
                      'border border-dashed border-paper-300 px-4',
                      'text-body text-ink-400 transition-colors duration-150',
                      'ease-out hover:border-basil-700 hover:text-basil-700',
                      'focus-visible:outline-2 focus-visible:outline-offset-2',
                      'focus-visible:outline-basil-700',
                    )}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add dinner
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
                        onServings={(servings) =>
                          setServings({ id: meal._id, servings })
                        }
                        onRemove={() => removeMeal({ id: meal._id })}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setPickerDate(date)}
                      className="rounded-btn px-1 py-1 text-meta font-medium text-basil-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700"
                    >
                      Add another
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
          size="sm"
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
          size="sm"
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
  onServings,
  onRemove,
}: {
  title: string
  servings: number
  onServings: (servings: number) => void
  onRemove: () => void
}) {
  return (
    <Card className="flex items-center gap-2 py-2 pr-2 pl-4">
      <p className="min-w-0 flex-1 truncate font-serif text-title font-medium text-ink-900">
        {title}
      </p>

      <div className="flex items-center gap-0.5 rounded-btn border border-paper-200 bg-paper-50">
        <button
          type="button"
          aria-label={`Fewer servings of ${title}`}
          disabled={servings <= 1}
          onClick={() => onServings(servings - 1)}
          className="rounded-btn p-2 text-ink-600 hover:bg-paper-200 disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span className="min-w-5 text-center text-meta font-semibold text-ink-900 tabular-nums">
          {servings}
        </span>
        <button
          type="button"
          aria-label={`More servings of ${title}`}
          onClick={() => onServings(servings + 1)}
          className="rounded-btn p-2 text-ink-600 hover:bg-paper-200"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        aria-label={`Remove ${title}`}
        onClick={onRemove}
        className="rounded-btn p-2 text-ink-400 hover:bg-paper-200 hover:text-danger-text"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </Card>
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
