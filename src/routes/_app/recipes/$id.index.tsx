import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Clock, Pencil, Users } from 'lucide-react'
import { AppHeader } from '../../../components/app-header'
import { Card } from '../../../components/ui/card'
import { EmptyState } from '../../../components/ui/empty-state'
import { SkeletonList } from '../../../components/ui/skeleton'
import { Tag } from '../../../components/ui/tag'
import { buttonClass } from '../../../components/ui/button'
import { ConfirmButton } from '../../../components/ui/confirm-button'
import { useDeleteRecipe, useRecipe } from '../../../hooks/use-recipes'
import { formatRecipeQuantity } from '../../../lib/units'
import type { Id } from '../../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_app/recipes/$id/')({
  component: RecipeDetail,
})

function RecipeDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const recipe = useRecipe(id as Id<'recipes'>)
  const deleteRecipe = useDeleteRecipe()

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
            emoji="🤔"
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

  return (
    <>
      <AppHeader />
      {/* Generous type and spacing: this screen gets read mid-cook. */}
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-stone-900">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="mt-1 text-stone-600">{recipe.description}</p>
            )}
          </div>
          <Link
            to="/recipes/$id/edit"
            params={{ id: recipe._id }}
            className={buttonClass('secondary', 'md', 'shrink-0')}
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden="true" />
            Serves {recipe.servings}
          </span>
          {recipe.prepTimeMinutes ? (
            <span>Prep {recipe.prepTimeMinutes} min</span>
          ) : null}
          {recipe.cookTimeMinutes ? (
            <span>Cook {recipe.cookTimeMinutes} min</span>
          ) : null}
          {totalTime > 0 && (
            <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
              <Clock className="size-4" aria-hidden="true" />
              {totalTime} min total
            </span>
          )}
        </div>

        {recipe.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {recipe.tags.map((tag) => (
              <li key={tag}>
                <Tag>{tag}</Tag>
              </li>
            ))}
          </ul>
        )}

        <section aria-labelledby="ingredients" className="mt-8">
          <h2 id="ingredients" className="text-lg font-semibold text-stone-900">
            Ingredients
          </h2>
          <Card className="mt-3 divide-y divide-stone-100">
            {recipe.ingredients.length === 0 && (
              <p className="p-4 text-sm text-stone-500">
                No ingredients listed.
              </p>
            )}
            {recipe.ingredients.map((ingredient, index) => (
              <div
                key={index}
                className="flex items-baseline justify-between gap-4 px-4 py-3.5"
              >
                <span className="text-base text-stone-800">
                  {ingredient.name}
                  {ingredient.note && (
                    <span className="text-stone-500"> — {ingredient.note}</span>
                  )}
                </span>
                <span className="shrink-0 font-semibold text-emerald-700 tabular-nums">
                  {formatRecipeQuantity(ingredient.quantity, ingredient.unit)}
                </span>
              </div>
            ))}
          </Card>
        </section>

        <section aria-labelledby="method" className="mt-8">
          <h2 id="method" className="text-lg font-semibold text-stone-900">
            Method
          </h2>
          {recipe.steps.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">No steps listed.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {recipe.steps.map((step, index) => (
                <li key={index}>
                  <Card className="flex gap-3 p-4">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <p className="text-base leading-relaxed text-stone-800">
                      {step}
                    </p>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="mt-10">
          <ConfirmButton
            className="w-full"
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
