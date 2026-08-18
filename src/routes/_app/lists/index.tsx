import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus, ShoppingBasket } from 'lucide-react'
import { AppHeader } from '../../../components/app-header'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { EmptyState } from '../../../components/ui/empty-state'
import { Sheet } from '../../../components/ui/sheet'
import { SkeletonList } from '../../../components/ui/skeleton'
import { buttonClass } from '../../../components/ui/button'
import {
  useGenerateListFromRecipes,
  useShoppingLists,
} from '../../../hooks/use-lists'
import { useRecipes } from '../../../hooks/use-recipes'
import { cn } from '../../../lib/cn'
import type { Id } from '../../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_app/lists/')({ component: ListsScreen })

const DATE_FORMAT = new Intl.DateTimeFormat('en-ZA', {
  day: 'numeric',
  month: 'short',
})

function ListsScreen() {
  const lists = useShoppingLists()
  const [picking, setPicking] = useState(false)

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-stone-900">Lists</h1>
          <Button onClick={() => setPicking(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New list
          </Button>
        </div>

        <div className="mt-4">
          {lists === undefined ? (
            <SkeletonList rows={3} />
          ) : lists.length === 0 ? (
            <EmptyState
              emoji="🧺"
              title="No lists yet"
              body="Generate one from your weekly plan, or pick a few recipes."
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link to="/plan" className={buttonClass('accent', 'md')}>
                    Go to the plan
                  </Link>
                  <Button variant="secondary" onClick={() => setPicking(true)}>
                    Pick recipes
                  </Button>
                </div>
              }
            />
          ) : (
            <ul className="space-y-3">
              {lists.map((list) => {
                const done =
                  list.itemCount > 0 && list.checkedCount === list.itemCount
                return (
                  <li key={list._id}>
                    <Link
                      to="/lists/$id"
                      params={{ id: list._id }}
                      className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
                        <span
                          className={cn(
                            'flex size-11 shrink-0 items-center justify-center rounded-xl',
                            done
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 text-emerald-700',
                          )}
                        >
                          <ShoppingBasket
                            className="size-5"
                            aria-hidden="true"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate font-semibold text-stone-900">
                            {list.name}
                          </h2>
                          <p className="text-sm text-stone-500">
                            {list.checkedCount} of {list.itemCount} ticked ·{' '}
                            {DATE_FORMAT.format(list.createdAt)}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>

      <RecipeMultiPicker open={picking} onClose={() => setPicking(false)} />
    </>
  )
}

/** Build a list straight from a handful of recipes, bypassing the plan. */
function RecipeMultiPicker({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const recipes = useRecipes()
  const generate = useGenerateListFromRecipes()
  const [selected, setSelected] = useState<Id<'recipes'>[]>([])
  const [busy, setBusy] = useState(false)

  function toggle(id: Id<'recipes'>) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title="Pick recipes">
      {recipes !== undefined && recipes.length === 0 ? (
        <EmptyState
          emoji="🥕"
          title="No recipes yet"
          body="Add a recipe and it can go straight onto a list."
        />
      ) : (
        <>
          <ul className="space-y-2">
            {(recipes ?? []).map((recipe) => {
              const isSelected = selected.includes(recipe._id)
              return (
                <li key={recipe._id}>
                  <label
                    aria-label={recipe.title}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-stone-200',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(recipe._id)}
                      className="size-5 accent-emerald-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-stone-800">
                        {recipe.title}
                      </span>
                      <span className="block text-xs text-stone-500">
                        Serves {recipe.servings}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div className="sticky bottom-0 mt-4 bg-white pt-3">
            <Button
              variant="accent"
              className="w-full"
              disabled={selected.length === 0 || busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const listId = await generate({ recipeIds: selected })
                  setSelected([])
                  onClose()
                  await navigate({ to: '/lists/$id', params: { id: listId } })
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy
                ? 'Generating…'
                : `Generate list (${selected.length} recipe${selected.length === 1 ? '' : 's'})`}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  )
}
