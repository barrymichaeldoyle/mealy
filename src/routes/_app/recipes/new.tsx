import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AppHeader } from '../../../components/app-header'
import { RecipeForm, emptyRecipeDraft } from '../../../components/recipe-form'
import { SkeletonList } from '../../../components/ui/skeleton'
import { useCreateRecipe } from '../../../hooks/use-recipes'
import { useHousehold, useUnitOptions } from '../../../hooks/use-household'
import { defined } from '../../../../convex/lib/optional'

export const Route = createFileRoute('/_app/recipes/new')({
  component: NewRecipe,
})

function NewRecipe() {
  const navigate = useNavigate()
  const createRecipe = useCreateRecipe()
  // The blank draft is built once, so the household's default unit has to be
  // known before the form mounts rather than arriving a render later.
  const household = useHousehold()
  const { defaultUnit } = useUnitOptions()

  return (
    <>
      <AppHeader title="New recipe" />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        {household === undefined ? (
          <SkeletonList rows={3} />
        ) : (
          <RecipeForm
            initial={emptyRecipeDraft(defaultUnit)}
            submitLabel="Save recipe"
            onCancel={() => navigate({ to: '/recipes' })}
            onSubmit={async (payload) => {
              const id = await createRecipe(defined(payload))
              await navigate({ to: '/recipes/$id', params: { id } })
            }}
          />
        )}
      </main>
    </>
  )
}
