import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { AppHeader } from '../../../components/app-header'
import { Button, buttonClass } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { ConfirmButton } from '../../../components/ui/confirm-button'
import { EmptyState } from '../../../components/ui/empty-state'
import { Field, Input, Select } from '../../../components/ui/field'
import { Sheet } from '../../../components/ui/sheet'
import { SkeletonList } from '../../../components/ui/skeleton'
import {
  useAddListItem,
  useClearChecked,
  useDeleteList,
  useRemoveListItem,
  useShoppingList,
  useToggleListItem,
  useUpdateListItem,
} from '../../../hooks/use-lists'
import { UNITS, formatListItem, type Unit } from '../../../lib/units'
import { cn } from '../../../lib/cn'
import type { Doc, Id } from '../../../../convex/_generated/dataModel'

export const Route = createFileRoute('/_app/lists/$id')({
  component: ListDetail,
})

type Item = Doc<'shoppingListItems'>

function ListDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const list = useShoppingList(id as Id<'shoppingLists'>)
  const toggleItem = useToggleListItem()
  const deleteList = useDeleteList()
  const clearChecked = useClearChecked()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)

  // Ticked items sink to the bottom so what's left to find stays on top.
  const items = list?.items ?? []
  const pending = items.filter((item) => !item.checked)
  const checked = items.filter((item) => item.checked)

  if (list === undefined) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
          <SkeletonList rows={5} />
        </main>
      </>
    )
  }

  if (list === null) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
          <EmptyState
            emoji="🤔"
            title="That list isn’t here"
            action={
              <Link to="/lists" className={buttonClass('secondary', 'md')}>
                Back to lists
              </Link>
            }
          />
        </main>
      </>
    )
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-stone-900">{list.name}</h1>
            <p className="mt-0.5 text-sm text-stone-500">
              {checked.length} of {list.items.length} ticked
            </p>
          </div>
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Button>
        </div>

        {list.items.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              emoji="🧺"
              title="This list is empty"
              body="Add something you need. Dish soap counts too."
              action={
                <Button variant="accent" onClick={() => setAdding(true)}>
                  Add an item
                </Button>
              }
            />
          </div>
        ) : (
          <Card className="mt-4 divide-y divide-stone-100 overflow-hidden">
            {pending.map((item) => (
              <ItemRow
                key={item._id}
                item={item}
                onToggle={toggleItem}
                onEdit={() => setEditing(item)}
              />
            ))}
            {checked.length > 0 && (
              <div className="bg-stone-50/60 px-4 py-2 text-xs font-medium text-stone-400 uppercase">
                In the basket
              </div>
            )}
            {checked.map((item) => (
              <ItemRow
                key={item._id}
                item={item}
                onToggle={toggleItem}
                onEdit={() => setEditing(item)}
              />
            ))}
          </Card>
        )}

        <div className="mt-8 space-y-3">
          {checked.length > 0 && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => clearChecked({ listId: list._id })}
            >
              Clear {checked.length} ticked item
              {checked.length === 1 ? '' : 's'}
            </Button>
          )}
          <ConfirmButton
            className="w-full"
            onConfirm={async () => {
              await deleteList({ id: list._id })
              await navigate({ to: '/lists' })
            }}
          >
            Delete list
          </ConfirmButton>
        </div>
      </main>

      <AddItemSheet
        open={adding}
        listId={list._id}
        onClose={() => setAdding(false)}
      />
      <EditItemSheet item={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function ItemRow({
  item,
  onToggle,
  onEdit,
}: {
  item: Item
  onToggle: ReturnType<typeof useToggleListItem>
  onEdit: () => void
}) {
  const amount = formatListItem(item)

  return (
    <div className="flex items-center gap-3 px-4 py-1">
      <label className="flex min-h-[52px] flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={(event) =>
            onToggle({ id: item._id, checked: event.target.checked })
          }
          className="size-5 shrink-0 accent-emerald-600"
        />
        <span
          className={cn(
            'min-w-0 flex-1 transition-opacity',
            item.checked && 'text-stone-400 line-through opacity-60',
          )}
        >
          <span className="block truncate text-base text-stone-800">
            {item.name}
          </span>
        </span>
        {amount && (
          <span
            className={cn(
              'shrink-0 text-sm font-semibold tabular-nums',
              item.checked ? 'text-stone-400 line-through' : 'text-emerald-700',
            )}
          >
            {amount}
          </span>
        )}
      </label>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${item.name}`}
        className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

const UNIT_OPTIONS: { value: Unit; label: string }[] = UNITS.map((unit) => ({
  value: unit,
  label: unit === 'none' ? 'no amount' : unit,
}))

function AddItemSheet({
  open,
  listId,
  onClose,
}: {
  open: boolean
  listId: Id<'shoppingLists'>
  onClose: () => void
}) {
  const addItem = useAddListItem()
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState<Unit>('none')

  return (
    <Sheet open={open} onClose={onClose} title="Add an item">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!name.trim()) return
          const parsed = Number(quantity)
          await addItem({
            listId,
            name,
            quantity:
              quantity.trim() && Number.isFinite(parsed) ? parsed : undefined,
            unit,
          })
          setName('')
          setQuantity('')
          setUnit('none')
          onClose()
        }}
      >
        <Field label="Item">
          {(id) => (
            <Input
              id={id}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Dish soap"
              autoComplete="off"
              required
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" hint="Optional">
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            )}
          </Field>
          <Field label="Unit">
            {(id) => (
              <Select
                id={id}
                value={unit}
                onChange={(event) => setUnit(event.target.value as Unit)}
              >
                {UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Button type="submit" variant="accent" className="w-full">
          Add to list
        </Button>
      </form>
    </Sheet>
  )
}

/**
 * Amounts here are the canonical metric values the list stores, so the unit
 * choices are limited to what a list line can actually hold.
 */
const CANONICAL_OPTIONS: { value: Unit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'item', label: 'item(s)' },
  { value: 'tin', label: 'tin(s)' },
  { value: 'pack', label: 'pack(s)' },
  { value: 'none', label: 'no amount' },
]

function EditItemSheet({
  item,
  onClose,
}: {
  item: Item | null
  onClose: () => void
}) {
  const updateItem = useUpdateListItem()
  const removeItem = useRemoveListItem()

  return (
    <Sheet open={item !== null} onClose={onClose} title="Edit item">
      {item && (
        <EditItemForm
          key={item._id}
          item={item}
          onSave={async (changes) => {
            await updateItem({ id: item._id, ...changes })
            onClose()
          }}
          onDelete={async () => {
            await removeItem({ id: item._id })
            onClose()
          }}
        />
      )}
    </Sheet>
  )
}

function EditItemForm({
  item,
  onSave,
  onDelete,
}: {
  item: Item
  onSave: (changes: {
    name: string
    quantity: number | null
    unit: Unit
  }) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(item.quantity?.toString() ?? '')
  const [unit, setUnit] = useState<Unit>(item.unit)

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!name.trim()) return
        const parsed = Number(quantity)
        await onSave({
          name,
          quantity: quantity.trim() && Number.isFinite(parsed) ? parsed : null,
          unit,
        })
      }}
    >
      <Field label="Item">
        {(id) => (
          <Input
            id={id}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount">
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          )}
        </Field>
        <Field label="Unit">
          {(id) => (
            <Select
              id={id}
              value={unit}
              onChange={(event) => setUnit(event.target.value as Unit)}
            >
              {CANONICAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="flex gap-3">
        <Button
          variant="danger"
          className="flex-1"
          onClick={onDelete}
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </Button>
        <Button type="submit" variant="accent" className="flex-1">
          Save
        </Button>
      </div>
    </form>
  )
}
