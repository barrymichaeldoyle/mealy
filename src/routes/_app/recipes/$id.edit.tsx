import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FileQuestion } from 'lucide-react'
import { AppHeader } from '../../../components/app-header'
import { RecipeForm, type RecipeDraft } from '../../../components/recipe-form'
import { SkeletonList } from '../../../components/ui/skeleton'
import { EmptyState } from '../../../components/ui/empty-state'
import { useRecipe, useUpdateRecipe } from '../../../hooks/use-recipes'
import type { Id } from '../../../../convex/_generated/dataModel'
import { defined } from '../../../../convex/lib/optional'

export const Route = createFileRoute('/_app/recipes/$id/edit')({
  component: EditRecipe,
})

function EditRecipe() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const recipe = useRecipe(id as Id<'recipes'>)
  const updateRecipe = useUpdateRecipe()

  if (recipe === undefined) {
    return (
      <>
        <AppHeader title="Edit recipe" />
        <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
          <SkeletonList rows={3} />
        </main>
      </>
    )
  }

  if (recipe === null) {
    return (
      <>
        <AppHeader title="Edit recipe" />
        <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
          <EmptyState icon={FileQuestion} title="That recipe isn’t here" />
        </main>
      </>
    )
  }

  const initial: RecipeDraft = {
    title: recipe.title,
    description: recipe.description ?? '',
    servings: String(recipe.servings),
    prepTimeMinutes: recipe.prepTimeMinutes?.toString() ?? '',
    cookTimeMinutes: recipe.cookTimeMinutes?.toString() ?? '',
    tags: recipe.tags.join(', '),
    ingredients: recipe.ingredients.map((ingredient, index) => ({
      key: `i${index}`,
      name: ingredient.name,
      quantity: ingredient.quantity?.toString() ?? '',
      unit: ingredient.unit,
      note: ingredient.note ?? '',
    })),
    steps: recipe.steps.map((text, index) => ({ key: `s${index}`, text })),
  }

  return (
    <>
      <AppHeader title="Edit recipe" />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        <RecipeForm
          initial={initial}
          submitLabel="Save changes"
          onCancel={() =>
            navigate({ to: '/recipes/$id', params: { id: recipe._id } })
          }
          onSubmit={async (payload) => {
            await updateRecipe({ id: recipe._id, ...defined(payload) })
            await navigate({ to: '/recipes/$id', params: { id: recipe._id } })
          }}
        />
      </main>
    </>
  )
}
