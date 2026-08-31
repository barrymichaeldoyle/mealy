import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus, ShoppingBasket } from 'lucide-react'
import { AppHeader } from '../../../components/app-header'
import { Button, buttonClass } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Checkbox } from '../../../components/ui/checkbox'
import { EmptyState } from '../../../components/ui/empty-state'
import { Field, Input } from '../../../components/ui/field'
import { PageHeader } from '../../../components/ui/page-header'
import { Sheet } from '../../../components/ui/sheet'
import { SkeletonList } from '../../../components/ui/skeleton'
import {
  useCreateList,
  useGenerateListFromRecipes,
  useShoppingLists,
} from '../../../hooks/use-lists'
import { useRecipes } from '../../../hooks/use-recipes'
import { shortDateLabel } from '../../../lib/dates'
import { consolidate, formatListItem } from '../../../lib/units'
import { ingredientInputs } from '../../../../convex/lib/lists'
import { cn } from '../../../lib/cn'
import { defined } from '../../../../convex/lib/optional'
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
              body="Start one for the shop you are about to do, or generate one from your weekly plan."
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="accent" onClick={() => setPicking(true)}>
                    New list
                  </Button>
                  <Link to="/plan" className={buttonClass('secondary', 'md')}>
                    Go to the plan
                  </Link>
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
                        <h2 className="text-pretty break-words font-serif text-title font-medium text-ink-900">
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

      <NewListSheet open={picking} onClose={() => setPicking(false)} />
    </>
  )
}

/**
 * One way in for both kinds of list: name it after wherever you are going,
 * and optionally fold some recipes into it. A shop is often not a week of
 * dinners, so recipes are the extra here, not the price of entry.
 */
function NewListSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const recipes = useRecipes()
  const createList = useCreateList()
  const generate = useGenerateListFromRecipes()
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Id<'recipes'>[]>([])
  const [busy, setBusy] = useState(false)

  function toggle(id: Id<'recipes'>) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    )
  }

  /*
   * The same arithmetic the mutation runs, from the same shared module, so
   * the preview cannot drift from what actually gets built.
   */
  const chosen = (recipes ?? []).filter((recipe) =>
    selected.includes(recipe._id),
  )
  const preview = consolidate(
    chosen.flatMap((recipe) => ingredientInputs(recipe, recipe.servings)),
  ).toSorted((a, b) => a.name.localeCompare(b.name))

  async function submit() {
    setBusy(true)
    try {
      const trimmed = name.trim()
      const listId =
        selected.length > 0
          ? await generate({
              ...defined({ name: trimmed || undefined }),
              recipeIds: selected,
            })
          : await createList(defined({ name: trimmed || undefined }))
      setName('')
      setSelected([])
      onClose()
      await navigate({ to: '/lists/$id', params: { id: listId } })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="New list">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field label="Name" hint="Where you are shopping, or what it is for.">
          {(id) => (
            <Input
              id={id}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Woolworths"
              autoComplete="off"
            />
          )}
        </Field>

        {recipes !== undefined && recipes.length > 0 && (
          <section aria-labelledby="new-list-recipes">
            <h3
              id="new-list-recipes"
              className="text-meta font-semibold text-ink-600"
            >
              Start it from recipes
            </h3>
            <p className="mt-1 text-meta text-ink-400">
              Optional. Their ingredients go on the list, merged.
            </p>
            <ul className="mt-2 space-y-2">
              {recipes.map((recipe) => {
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
          </section>
        )}

        {preview.length > 0 && (
          /*
           * What you are about to get. Generating used to create the list
           * and navigate away, so what went in, and what merged into what,
           * was only discoverable afterwards.
           */
          <section aria-labelledby="list-preview">
            <h3
              id="list-preview"
              className="text-meta font-semibold text-ink-600"
            >
              {preview.length} item{preview.length === 1 ? '' : 's'} on the list
            </h3>
            <ul className="mt-2 space-y-1">
              {preview.map((item) => (
                <li
                  key={`${item.name}-${item.unit}`}
                  className="flex justify-between gap-3 text-meta text-ink-600"
                >
                  <span className="min-w-0 break-words">{item.name}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatListItem({ ...item, quantity: item.quantity })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="sticky bottom-0 bg-paper-100 pt-3">
          <Button
            type="submit"
            variant="accent"
            className="w-full"
            disabled={busy}
          >
            {busy
              ? 'Creating…'
              : selected.length > 0
                ? `Create list (${selected.length} recipe${selected.length === 1 ? '' : 's'})`
                : 'Create list'}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
