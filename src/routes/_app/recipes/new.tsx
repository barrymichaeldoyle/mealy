import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AppHeader } from '../../../components/app-header'
import { RecipeForm, emptyRecipeDraft } from '../../../components/recipe-form'
import { useCreateRecipe } from '../../../hooks/use-recipes'

export const Route = createFileRoute('/_app/recipes/new')({
  component: NewRecipe,
})

function NewRecipe() {
  const navigate = useNavigate()
  const createRecipe = useCreateRecipe()

  return (
    <>
      <AppHeader title="New recipe" />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        <RecipeForm
          initial={emptyRecipeDraft()}
          submitLabel="Save recipe"
          onCancel={() => navigate({ to: '/recipes' })}
          onSubmit={async (payload) => {
            const id = await createRecipe(payload)
            await navigate({ to: '/recipes/$id', params: { id } })
          }}
        />
      </main>
    </>
  )
}
