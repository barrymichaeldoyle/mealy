import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { CalendarPlus, FileQuestion, Minus, Pencil, Plus } from 'lucide-react'
import { AppHeader } from '../../../components/app-header'
import { Card } from '../../../components/ui/card'
import { Chip } from '../../../components/ui/chip'
import { EmptyState } from '../../../components/ui/empty-state'
import { ListRow, ListRows } from '../../../components/ui/list-row'
import { SkeletonList } from '../../../components/ui/skeleton'
import { buttonClass } from '../../../components/ui/button'
import { ConfirmButton } from '../../../components/ui/confirm-button'
import { useDeleteRecipe, useRecipe } from '../../../hooks/use-recipes'
import { formatEquivalent, formatRecipeQuantity } from '../../../lib/units'
import { cn } from '../../../lib/cn'
import { useUnitSystems } from '../../../hooks/use-household'
import { usePlannedDatesForRecipe } from '../../../hooks/use-plan'
import { weekdayLongLabel, type IsoDate } from '../../../lib/dates'
import { useOnlineStatus } from '../../../hooks/use-online-status'
import { useWakeLock } from '../../../hooks/use-wake-lock'
import type { Id } from '../../../../convex/_generated/dataModel'

type RecipeSearch = { servings?: number; created?: boolean }

export const Route = createFileRoute('/_app/recipes/$id/')({
  component: RecipeDetail,
  /*
   * The plan knows you scaled Thursday to six. Without this the recipe page
   * showed the serves-four quantities anyway and left the arithmetic to you,
   * at the stove, with floury hands.
   */
  validateSearch: (search: Record<string, unknown>): RecipeSearch => {
    const servings = Number(search['servings'])
    return {
      ...(Number.isFinite(servings) && servings >= 1 && servings <= 100
        ? { servings }
        : {}),
      // Set by the save that just happened, so the next steps show once.
      ...(search['created'] === true || search['created'] === 'true'
        ? { created: true }
        : {}),
    }
  },
})

function RecipeDetail() {
  const { id } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const recipe = useRecipe(id as Id<'recipes'>)
  const deleteRecipe = useDeleteRecipe()
  const systems = useUnitSystems()
  const [servings, setServings] = useState<number | null>(null)
  const online = useOnlineStatus()
  // Cook mode: the screen stays on while a recipe is open.
  useWakeLock(recipe !== undefined && recipe !== null)
  const plannedDates = usePlannedDatesForRecipe(id as Id<'recipes'>)

  if (recipe === undefined) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
          <SkeletonList rows={3} />
        </main>
      </>
    )
  }

  if (recipe === null) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
          <EmptyState
            icon={FileQuestion}
            title="That recipe isn’t here"
            body="It may have been deleted."
            action={
              <Link to="/recipes" className={buttonClass('secondary', 'md')}>
                Back to recipes
              </Link>
            }
          />
        </main>
      </>
    )
  }

  const totalTime =
    (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)
  const meta = [
    recipe.prepTimeMinutes ? `prep ${recipe.prepTimeMinutes} min` : null,
    recipe.cookTimeMinutes ? `cook ${recipe.cookTimeMinutes} min` : null,
    totalTime > 0 ? `${totalTime} min total` : null,
    `written for ${recipe.servings}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const cooking = servings ?? search.servings ?? recipe.servings
  const scale = cooking / recipe.servings

  return (
    <>
      <AppHeader />
      {/*
       * Cook mode: this page gets read from a metre away with floury hands,
       * so the type runs a size up and the method column is capped at about
       * 34ch. It should feel like a page, not a form.
       */}
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        {search.created && <JustSaved recipeId={recipe._id} />}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-display font-semibold text-ink-900">
              {recipe.title}
            </h1>
            <p className="mt-1 text-meta font-medium text-ink-400 tabular-nums">
              {meta}
            </p>
          </div>
          {online && (
            <Link
              to="/recipes/$id/edit"
              params={{ id: recipe._id }}
              className={buttonClass('secondary', 'md', 'mt-1 shrink-0')}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Link>
          )}
        </div>

        {!online && (
          <output className="mt-4 block rounded-card border border-line bg-paper-100 px-4 py-3 text-meta font-medium text-ink-600">
            Offline. This is your saved copy, so you can read and cook from it.
            Editing needs a connection.
          </output>
        )}

        {recipe.description && (
          <p className="mt-3 max-w-[34ch] text-cook text-ink-600">
            {recipe.description}
          </p>
        )}

        {recipe.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {recipe.tags.map((tag) => (
              <li key={tag}>
                <Chip>{tag}</Chip>
              </li>
            ))}
          </ul>
        )}

        <section aria-labelledby="ingredients" className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="ingredients"
              className="font-serif text-title font-medium text-ink-900"
            >
              Ingredients
            </h2>
            <ServingsStepper
              value={cooking}
              onChange={(next) => setServings(next)}
            />
          </div>
          {scale !== 1 && (
            <p className="mt-2 text-meta text-ink-400">
              Scaled from {recipe.servings}.
            </p>
          )}
          <Card className="mt-3 overflow-hidden">
            {recipe.ingredients.length === 0 ? (
              <p className="px-4 py-4 text-body text-ink-400">
                No ingredients listed.
              </p>
            ) : (
              <ListRows>
                {recipe.ingredients.map((ingredient, index) => {
                  const quantity =
                    ingredient.quantity === undefined
                      ? undefined
                      : ingredient.quantity * scale
                  const equivalent = formatEquivalent(
                    quantity,
                    ingredient.unit,
                    systems,
                  )
                  return (
                    <ListRow key={index} className="justify-between">
                      <span className="text-cook text-ink-900">
                        {ingredient.name}
                        {ingredient.note && (
                          <span className="text-ink-400">
                            , {ingredient.note}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-cook font-semibold text-ink-600 tabular-nums">
                          {formatRecipeQuantity(quantity, ingredient.unit)}
                        </span>
                        {equivalent && (
                          <span className="block text-meta text-ink-400 tabular-nums">
                            {equivalent}
                          </span>
                        )}
                      </span>
                    </ListRow>
                  )
                })}
              </ListRows>
            )}
          </Card>
        </section>

        <section aria-labelledby="method" className="mt-10">
          <h2
            id="method"
            className="font-serif text-title font-medium text-ink-900"
          >
            Method
          </h2>
          {recipe.steps.length === 0 ? (
            <p className="mt-3 text-body text-ink-400">No steps listed.</p>
          ) : (
            <ol className="mt-4 space-y-6">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex gap-4">
                  <span
                    className="shrink-0 text-title font-semibold text-basil-700 tabular-nums"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <p className="max-w-[34ch] text-cook text-ink-900">{step}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/*
         * What a recipe is for, next to what ends it. Delete used to be the
         * only thing you could do from the bottom of this page.
         */}
        <div className="mt-12 flex flex-wrap gap-3">
          {online && (
            <Link
              to="/plan"
              search={{ add: recipe._id }}
              className={buttonClass('secondary', 'md')}
            >
              <CalendarPlus className="size-4" aria-hidden="true" />
              Add to the plan
            </Link>
          )}
          <ConfirmButton
            disabled={!online}
            title="Delete this recipe?"
            description={plannedDescription(recipe.title, plannedDates)}
            confirmLabel="Delete recipe"
            onConfirm={async () => {
              await deleteRecipe({ id: recipe._id })
              await navigate({ to: '/recipes' })
            }}
          >
            Delete recipe
          </ConfirmButton>
        </div>
      </main>
    </>
  )
}

/**
 * Where to go now the recipe is saved. Two things people do next: cook it,
 * which means putting it on a day, or keep typing while the book is open.
 * The recipe itself is underneath, so this says what happened and gets out
 * of the way rather than confirming in a dialog.
 */
function JustSaved({ recipeId }: { recipeId: Id<'recipes'> }) {
  return (
    <output className="mb-4 block rounded-card border border-basil-700 bg-basil-100/50 px-5 py-4">
      <p className="font-serif text-title font-medium text-ink-900">
        Saved to your recipes
      </p>
      {/*
       * Two, side by side even on a phone. A third stacked row pushed the
       * recipe itself off the screen, and the way back to all recipes is
       * already in the nav.
       */}
      <div className="mt-3 flex gap-2">
        <Link
          to="/plan"
          search={{ add: recipeId }}
          className={buttonClass('primary', 'md', 'flex-1 whitespace-nowrap')}
        >
          <CalendarPlus className="size-4" aria-hidden="true" />
          Add to the plan
        </Link>
        <Link
          to="/recipes/new"
          className={buttonClass('secondary', 'md', 'flex-1 whitespace-nowrap')}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add another
        </Link>
      </div>
    </output>
  )
}

/**
 * How many you are cooking for right now, which is not always what the
 * recipe was written for. Scaling lives here rather than in the recipe
 * because it changes per meal, and the plan already tracks it per meal.
 */
function ServingsStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (next: number) => void
}) {
  const step = cn(
    'flex size-11 items-center justify-center rounded-btn text-ink-600',
    'transition-colors duration-150 ease-out hover:bg-paper-200',
    'disabled:opacity-40 disabled:hover:bg-transparent',
    'focus-visible:outline-2 focus-visible:-outline-offset-2',
    'focus-visible:outline-basil-700',
  )
  return (
    <div className="flex shrink-0 items-center rounded-btn border border-line bg-paper-50">
      <button
        type="button"
        aria-label="Cook for fewer"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className={step}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      {/*
       * The number needs saying out loud, since the buttons beside it only
       * say which way they go.
       */}
      <span className="px-1 text-meta font-semibold text-ink-900 tabular-nums">
        serves <span className="text-body">{value}</span>
      </span>
      <button
        type="button"
        aria-label="Cook for more"
        disabled={value >= 100}
        onClick={() => onChange(value + 1)}
        className={step}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * Deleting a recipe takes its planned meals with it. Someone else in the
 * household may have put it on Thursday, so the confirmation says which
 * days go rather than leaving them to find out on the plan.
 */
function plannedDescription(
  title: string,
  dates: string[] | undefined,
): string {
  const base = `“${title}” will be permanently deleted. This cannot be undone.`
  if (!dates || dates.length === 0) {
    return base
  }
  const days = dates.map((date) => weekdayLongLabel(date as IsoDate))
  const listed =
    days.length === 1
      ? days[0]
      : `${days.slice(0, -1).join(', ')} and ${days.at(-1)}`
  return `${base} It is planned for ${listed}, and ${
    days.length === 1 ? 'that meal goes' : 'those meals go'
  } with it.`
}
