import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { BookOpen, Plus, ShoppingBasket } from 'lucide-react'
import { AppHeader } from '../../../components/app-header'
import { Button, buttonClass } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Checkbox } from '../../../components/ui/checkbox'
import { EmptyState } from '../../../components/ui/empty-state'
import { PageHeader } from '../../../components/ui/page-header'
import { Sheet } from '../../../components/ui/sheet'
import { SkeletonList } from '../../../components/ui/skeleton'
import {
  useGenerateListFromRecipes,
  useShoppingLists,
} from '../../../hooks/use-lists'
import { useRecipes } from '../../../hooks/use-recipes'
import { shortDateLabel } from '../../../lib/dates'
import { cn } from '../../../lib/cn'
import type { Id } from '../../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_app/lists/')({ component: ListsScreen })

function ListsScreen() {
  const lists = useShoppingLists()
  const [picking, setPicking] = useState(false)

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        <PageHeader
          title="Lists"
          action={
            <Button onClick={() => setPicking(true)}>
              <Plus className="size-4" aria-hidden="true" />
              New list
            </Button>
          }
        />

        <div className="mt-4">
          {lists === undefined ? (
            <SkeletonList rows={3} />
          ) : lists.length === 0 ? (
            <EmptyState
              icon={ShoppingBasket}
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
                      className="block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700"
                    >
                      <Card
                        className={cn(
                          'px-5 py-4 transition-colors duration-150 ease-out',
                          done ? 'bg-basil-100' : 'hover:border-paper-300',
                        )}
                      >
                        <h2 className="truncate font-serif text-title font-medium text-ink-900">
                          {list.name}
                        </h2>
                        <p className="mt-1 text-meta font-medium text-ink-400 tabular-nums">
                          {done
                            ? 'all ticked'
                            : `${list.checkedCount} of ${list.itemCount} ticked`}
                          {' · '}
                          {shortDateLabel(list.createdAt)}
                        </p>
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
          icon={BookOpen}
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
                    htmlFor={`pick-${recipe._id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-card border px-4 py-3',
                      'transition-colors duration-150 ease-out',
                      isSelected
                        ? 'border-basil-700 bg-basil-100'
                        : 'border-paper-200 bg-paper-50',
                    )}
                  >
                    <Checkbox
                      id={`pick-${recipe._id}`}
                      checked={isSelected}
                      onChange={() => toggle(recipe._id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-title font-medium text-ink-900">
                        {recipe.title}
                      </span>
                      <span className="block text-meta font-medium text-ink-400">
                        serves {recipe.servings}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div className="sticky bottom-0 mt-4 bg-paper-100 pt-3">
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
