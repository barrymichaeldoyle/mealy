import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Store, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { ConfirmButton } from './ui/confirm-button'
import { Field, Input } from './ui/field'
import {
  useAddCategory,
  useAddStore,
  useCatalogue,
  useForgetItem,
  useRemoveCategory,
  useRemoveStore,
  useRenameCategory,
  useRenameStore,
  useReorderCategories,
  useReorderStores,
  useShops,
} from '../hooks/use-shops'
import type { Id } from '../../convex/_generated/dataModel'

type Row = { _id: string; name: string }

/** The two lists that make a shopping list know where to send you. */
export function ShopsCard() {
  const shops = useShops()

  const addStore = useAddStore()
  const renameStore = useRenameStore()
  const removeStore = useRemoveStore()
  const reorderStores = useReorderStores()

  const addCategory = useAddCategory()
  const renameCategory = useRenameCategory()
  const removeCategory = useRemoveCategory()
  const reorderCategories = useReorderCategories()

  if (!shops) {
    return null
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-serif text-title font-medium text-ink-900">
        <Store className="size-5 text-ink-400" aria-hidden="true" />
        Shops and aisles
      </h2>
      <p className="mt-1 text-body text-ink-600">
        A shop you name here can have a list of its own. Say once where
        something is sold and every list built after that puts it on the right
        one.
      </p>

      <OrderedList
        legend="Shops"
        singular="shop"
        hint="In the order you would rather buy things. Something sold at two shops goes on the list for the higher one."
        placeholder="Woolworths"
        empty="No shops yet, so every list is just a list."
        rows={shops.stores}
        onAdd={(name) => addStore({ name })}
        onRename={(id, name) => renameStore({ id: id as Id<'stores'>, name })}
        onRemove={(id) => removeStore({ id: id as Id<'stores'> })}
        onReorder={(ids) => reorderStores({ ids: ids as Id<'stores'>[] })}
        removeDescription={(name) =>
          `Lists made for ${name} stay, as lists for no shop in particular. Nothing on them is deleted.`
        }
      />

      <OrderedList
        legend="Aisles"
        singular="aisle"
        hint="In the order you walk them. A list groups itself into these."
        placeholder="Deli"
        empty="No aisles, so lists stay in one run."
        rows={shops.categories}
        onAdd={(name) => addCategory({ name })}
        onRename={(id, name) =>
          renameCategory({ id: id as Id<'categories'>, name })
        }
        onRemove={(id) => removeCategory({ id: id as Id<'categories'> })}
        onReorder={(ids) =>
          reorderCategories({ ids: ids as Id<'categories'>[] })
        }
        removeDescription={(name) =>
          `Anything filed under ${name} moves to the unsorted section. Nothing is deleted.`
        }
      />
    </Card>
  )
}

/**
 * Add, rename, delete and reorder, with buttons rather than a drag handle.
 * Ordering matters here and the screen is used one-handed on a phone, where
 * dragging a row is the gesture most likely to end in the wrong place.
 */
function OrderedList({
  legend,
  singular,
  hint,
  placeholder,
  empty,
  rows,
  onAdd,
  onRename,
  onRemove,
  onReorder,
  removeDescription,
}: {
  legend: string
  singular: string
  hint: string
  placeholder: string
  empty: string
  rows: Row[]
  onAdd: (name: string) => Promise<unknown>
  onRename: (id: string, name: string) => Promise<unknown>
  onRemove: (id: string) => Promise<unknown>
  onReorder: (ids: string[]) => Promise<unknown>
  removeDescription: (name: string) => string
}) {
  const [adding, setAdding] = useState('')

  async function move(index: number, by: number) {
    const ids = rows.map((row) => row._id)
    const target = index + by
    const moved = ids[index]
    const displaced = ids[target]
    if (moved === undefined || displaced === undefined) {
      return
    }
    ids[index] = displaced
    ids[target] = moved
    await onReorder(ids)
  }

  return (
    <section className="mt-6">
      <h3 className="text-meta font-semibold text-ink-900">{legend}</h3>
      <p className="mt-0.5 text-meta text-ink-400">{hint}</p>

      {rows.length === 0 ? (
        <p className="mt-3 text-body text-ink-600">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-paper-200">
          {rows.map((row, index) => (
            <li key={row._id} className="flex items-center gap-2 py-2">
              <RowName
                key={row.name}
                name={row.name}
                onSave={(name) => onRename(row._id, name)}
              />
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => void move(index, -1)}
                  aria-label={`Move ${row.name} up`}
                  className="rounded-btn p-2 text-ink-400 hover:bg-paper-200 hover:text-ink-600 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronUp className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={index === rows.length - 1}
                  onClick={() => void move(index, 1)}
                  aria-label={`Move ${row.name} down`}
                  className="rounded-btn p-2 text-ink-400 hover:bg-paper-200 hover:text-ink-600 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronDown className="size-4" aria-hidden="true" />
                </button>
                <ConfirmButton
                  size="sm"
                  title={`Delete ${row.name}?`}
                  description={removeDescription(row.name)}
                  confirmLabel="Delete"
                  aria-label={`Delete ${row.name}`}
                  onConfirm={() => onRemove(row._id)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={async (event) => {
          event.preventDefault()
          const name = adding.trim()
          if (!name) {
            return
          }
          setAdding('')
          await onAdd(name)
        }}
      >
        <Field label={`New ${singular}`} className="flex-1">
          {(id) => (
            <Input
              id={id}
              value={adding}
              maxLength={40}
              placeholder={placeholder}
              autoComplete="off"
              onChange={(event) => setAdding(event.target.value)}
            />
          )}
        </Field>
        {/*
         * Named for what it adds. Two buttons both saying "Add" on one
         * screen is a coin toss for anyone listening to it rather than
         * looking at it.
         */}
        <Button type="submit" disabled={!adding.trim()}>
          <Plus className="size-4" aria-hidden="true" />
          Add {singular}
        </Button>
      </form>
    </section>
  )
}

/** Rename in place: the name is the whole row, so it is the whole edit. */
function RowName({
  name,
  onSave,
}: {
  name: string
  onSave: (name: string) => Promise<unknown>
}) {
  const [draft, setDraft] = useState(name)

  return (
    <Input
      value={draft}
      maxLength={40}
      aria-label={`Rename ${name}`}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const trimmed = draft.trim()
        if (!trimmed) {
          setDraft(name)
          return
        }
        if (trimmed !== name) {
          void onSave(trimmed)
        }
      }}
    />
  )
}

/**
 * What the household has filed so far, and the way to unfile it.
 *
 * Correcting a placement is done from the list itself, where you are
 * standing when you notice it is wrong. This screen is for the other case:
 * something filed under the wrong shop months ago that is not on any list
 * to correct from.
 */
export function CatalogueCard() {
  const shops = useShops()
  const filed = useCatalogue()
  const forget = useForgetItem()

  if (!shops || !filed || filed.length === 0) {
    return null
  }

  const storeNames = new Map(
    shops.stores.map((store) => [store._id, store.name]),
  )
  const aisleNames = new Map(
    shops.categories.map((category) => [category._id, category.name]),
  )

  return (
    <Card className="p-5">
      <h2 className="font-serif text-title font-medium text-ink-900">
        What Mealy has learned
      </h2>
      <p className="mt-1 text-body text-ink-600">
        {filed.length} thing{filed.length === 1 ? '' : 's'} it can place on its
        own. Change one from any list it is on, or forget it here and it will
        ask again.
      </p>

      <ul className="mt-3 divide-y divide-paper-200">
        {filed.map((entry) => {
          const where = entry.storeIds
            .flatMap((storeId) => {
              const name = storeNames.get(storeId)
              return name ? [name] : []
            })
            .join(', ')
          const aisle = entry.categoryId
            ? aisleNames.get(entry.categoryId)
            : undefined
          const detail = [where, aisle].filter(Boolean).join(' · ')

          return (
            <li key={entry._id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block break-words text-body text-ink-900">
                  {entry.name}
                </span>
                <span className="block text-meta text-ink-400">
                  {detail || 'no shop or aisle yet'}
                </span>
              </span>
              <ConfirmButton
                size="sm"
                title={`Forget ${entry.name}?`}
                description={`Mealy will stop putting ${entry.name} on a shop's list by itself. Lists it is already on are untouched.`}
                confirmLabel="Forget it"
                aria-label={`Forget ${entry.name}`}
                onConfirm={() => forget({ id: entry._id })}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </ConfirmButton>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
