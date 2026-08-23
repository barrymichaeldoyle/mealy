import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Check,
  ChevronRight,
  Pencil,
  Plus,
  ShoppingBasket,
  Trash2,
} from 'lucide-react'
import { AppHeader } from '../../../components/app-header'
import { Button, buttonClass } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Checkbox } from '../../../components/ui/checkbox'
import { ConfirmButton } from '../../../components/ui/confirm-button'
import { UndoBar } from '../../../components/ui/undo-bar'
import { EmptyState } from '../../../components/ui/empty-state'
import { Field, Input, Select } from '../../../components/ui/field'
import { ListRow, ListRows } from '../../../components/ui/list-row'
import { PageHeader } from '../../../components/ui/page-header'
import { Sheet } from '../../../components/ui/sheet'
import { SkeletonList } from '../../../components/ui/skeleton'
import {
  useAddListItem,
  useClearChecked,
  useRestoreListItems,
  useDeleteList,
  useRemoveListItem,
  useShoppingList,
  useToggleListItem,
  useUpdateListItem,
} from '../../../hooks/use-lists'
import {
  UNIT_OPTION_LABELS,
  formatListItem,
  type Unit,
} from '../../../lib/units'
import { useUnitOptions } from '../../../hooks/use-household'
import { cn } from '../../../lib/cn'
import type { Id } from '../../../../convex/_generated/dataModel'
import type { CachedShoppingListItem } from '../../../lib/offline-lists'
import { useOnlineStatus } from '../../../hooks/use-online-status'
import { useHousehold } from '../../../hooks/use-household'
import { defined } from '../../../../convex/lib/optional'

export const Route = createFileRoute('/_app/lists/$id')({
  component: ListDetail,
})

type Item = CachedShoppingListItem
type ItemId = Id<'shoppingListItems'>

/** How long a ticked row stays where it is before it joins the done pile. */
const SETTLE_MS = 300

function wantsMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function ListDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const list = useShoppingList(id as Id<'shoppingLists'>)
  const online = useOnlineStatus()
  const household = useHousehold()
  const toggleItem = useToggleListItem()
  const deleteList = useDeleteList()
  const clearChecked = useClearChecked()
  const restoreItems = useRestoreListItems()
  // What was just cleared, held only long enough to offer it back.
  const [cleared, setCleared] = useState<Item[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)

  /*
   * A row you have just ticked holds its place for a moment before dropping
   * into the done pile. Without the pause, ticking three things in a row
   * makes the list jump under your thumb and you mis-tap the next one.
   */
  const [settling, setSettling] = useState<ItemId[]>([])

  function handleToggle(itemId: ItemId, checked: boolean) {
    if (checked && wantsMotion()) {
      setSettling((current) => [...current, itemId])
      setTimeout(() => {
        setSettling((current) => current.filter((value) => value !== itemId))
      }, SETTLE_MS)
    }
    void toggleItem({ id: itemId, checked })
  }

  const items = list?.items ?? []
  const held = new Set(settling)
  const pending = items.filter((item) => !item.checked || held.has(item._id))
  const done = items.filter((item) => item.checked && !held.has(item._id))
  const checkedCount = items.filter((item) => item.checked).length
  // Nobody to tell apart in a household of one, so no names are shown.
  const shared = Boolean(list?.sharedWith)
  const meId = household?.userId
  const plural = checkedCount === 1 ? '' : 's'

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
            icon={ShoppingBasket}
            title="That list isn’t here"
            body="It may have been deleted."
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
        <PageHeader
          title={list.name}
          meta={`${checkedCount} of ${items.length} ticked`}
          action={
            online ? (
              <Button onClick={() => setAdding(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add
              </Button>
            ) : null
          }
        />

        {!online && (
          <output className="mt-4 block rounded-card border border-line bg-paper-100 px-4 py-3 text-meta font-medium text-ink-600">
            Offline. Keep ticking, and it will sync when your connection
            returns. Adding, editing and deleting need a connection, so they are
            not here until it comes back.
          </output>
        )}

        {items.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={ShoppingBasket}
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
          <div className="mt-4 space-y-3">
            {/*
             * The end of the shop. Ticking the last item used to empty the
             * screen and leave a collapsed drawer sitting above Clear and
             * Delete, so the one satisfying moment in the app rendered as
             * an empty state between two destructive buttons.
             */}
            {pending.length === 0 && (
              <div className="rounded-card border border-basil-700 bg-basil-100/50 px-5 py-8 text-center">
                <Check
                  className="mx-auto size-8 text-basil-700"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                <p className="mt-3 font-serif text-title font-medium text-ink-900">
                  That is everything
                </p>
                <p className="mt-1 text-body text-ink-600">
                  {items.length} item{items.length === 1 ? '' : 's'} ticked off{' '}
                  {list.name}.
                </p>
                <Link
                  to="/lists"
                  className={buttonClass('secondary', 'md', 'mt-5')}
                >
                  Back to lists
                </Link>
              </div>
            )}

            {pending.length > 0 && (
              <Card className="overflow-hidden">
                <ListRows>
                  {pending.map((item) => (
                    <ItemRow
                      key={item._id}
                      item={item}
                      shared={shared}
                      meId={meId}
                      onToggle={handleToggle}
                      onEdit={online ? () => setEditing(item) : undefined}
                    />
                  ))}
                </ListRows>
              </Card>
            )}

            {done.length > 0 && (
              <Card className="overflow-hidden">
                <details className="group">
                  <summary className="flex min-h-[52px] list-none items-center gap-2 px-4 text-meta font-semibold text-ink-600 marker:content-none [&::-webkit-details-marker]:hidden">
                    <ChevronRight
                      className="size-4 transition-transform duration-150 ease-out group-open:rotate-90"
                      aria-hidden="true"
                    />
                    Done ({done.length})
                  </summary>
                  <ListRows className="border-t border-paper-200">
                    {done.map((item) => (
                      <ItemRow
                        key={item._id}
                        item={item}
                        shared={shared}
                        meId={meId}
                        onToggle={handleToggle}
                        onEdit={online ? () => setEditing(item) : undefined}
                      />
                    ))}
                  </ListRows>
                </details>
              </Card>
            )}
          </div>
        )}

        {/* Destructive actions need the server, so offline they are absent
            rather than present and unreachable. */}
        <div className="mt-8 space-y-3">
          {online && checkedCount > 0 && (
            /*
             * This deletes every ticked row for good. Deleting one item asks
             * first, so the button that deletes twelve of them has to ask
             * too: friction belongs in proportion to what is lost.
             */
            <ConfirmButton
              variant="secondary"
              className="w-full"
              title={`Delete ${checkedCount} ticked item${plural}?`}
              description={`They will be permanently deleted from “${list.name}”. The items you have not ticked stay.`}
              confirmLabel={`Delete ${checkedCount} item${plural}`}
              onConfirm={async () => {
                const removed = items.filter((item) => item.checked)
                await clearChecked({ listId: list._id })
                setCleared(removed)
              }}
            >
              Clear {checkedCount} ticked item{plural}
            </ConfirmButton>
          )}
          {online && (
            <ConfirmButton
              className="w-full"
              title="Delete this list?"
              description={`“${list.name}” and every item in it will be permanently deleted.`}
              confirmLabel="Delete list"
              onConfirm={async () => {
                await deleteList({ id: list._id })
                await navigate({ to: '/lists' })
              }}
            >
              Delete list
            </ConfirmButton>
          )}
        </div>
      </main>

      {cleared && (
        <UndoBar
          message={`Deleted ${cleared.length} item${cleared.length === 1 ? '' : 's'}`}
          onDismiss={() => setCleared(null)}
          onUndo={async () => {
            const restoring = cleared
            setCleared(null)
            await restoreItems({
              listId: list._id,
              items: restoring.map((item) => ({
                ...defined({ quantity: item.quantity }),
                name: item.name,
                unit: item.unit,
                checked: item.checked,
                manuallyAdded: item.manuallyAdded,
                approximate: item.approximate,
                sourceRecipeIds: item.sourceRecipeIds,
              })),
            })
          }}
        />
      )}

      <AddItemSheet
        open={adding}
        listId={list._id}
        onClose={() => setAdding(false)}
      />
      <EditItemSheet item={editing} onClose={() => setEditing(null)} />
    </>
  )
}

/**
 * `[ ○ ]  name                    ≈480g`
 *
 * The ≈ is set a shade quieter than the number it qualifies, so it reads as
 * a caveat rather than part of the amount. Ticking strikes the row through
 * as well as tinting it: green alone would not survive a colour-blind eye.
 */
function ItemRow({
  item,
  shared,
  meId,
  onToggle,
  onEdit,
}: {
  item: Item
  shared: boolean
  meId: string | undefined
  onToggle: (id: ItemId, checked: boolean) => void
  onEdit: (() => void) | undefined
}) {
  const amount = formatListItem(item)
  const approximate = amount.startsWith('≈')
  /*
   * Only when somebody else ticked it. You know what you put in the trolley,
   * and a name against every row you touched is noise on the screen you are
   * reading one-handed.
   */
  const byOther = shared && item.checkedByName && item.checkedBy !== meId

  return (
    <ListRow
      className={cn(
        'gap-0 py-0 pr-2 transition-colors duration-150 ease-out',
        item.checked && 'bg-basil-100',
      )}
    >
      <label
        htmlFor={`item-${item._id}`}
        className="flex min-h-[52px] flex-1 items-center gap-3 py-2"
      >
        <Checkbox
          id={`item-${item._id}`}
          checked={item.checked}
          onChange={(event) => onToggle(item._id, event.target.checked)}
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-pretty break-words text-body',
              item.checked ? 'text-ink-400 line-through' : 'text-ink-900',
            )}
          >
            {item.name}
          </span>
          {/*
           * Who has it, so the other person in the shop does not buy it
           * again. A sibling of the name rather than a child, because
           * text-decoration propagates and a strikethrough over somebody's
           * name reads as though they were crossed off too.
           */}
          {byOther && (
            <span className="block text-meta font-medium text-ink-400">
              {item.checkedByName} got this
            </span>
          )}
        </span>
        <span
          className={cn(
            'shrink-0 pl-3 text-body font-semibold tabular-nums',
            item.checked ? 'text-ink-400 line-through' : 'text-ink-600',
          )}
        >
          {approximate && <span className="font-normal text-ink-400">≈</span>}
          {approximate ? amount.slice(1) : amount}
        </span>
      </label>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${item.name}`}
          className="rounded-btn p-2 text-ink-400 hover:bg-paper-200 hover:text-ink-600"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      )}
    </ListRow>
  )
}

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
  const { units } = useUnitOptions()
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState<Unit>('none')

  return (
    <Sheet open={open} onClose={onClose} title="Add an item">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!name.trim()) {
            return
          }
          const parsed = Number(quantity)
          await addItem({
            ...defined({
              quantity:
                quantity.trim() && Number.isFinite(parsed) ? parsed : undefined,
            }),
            listId,
            name,
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
                {units.map((option) => (
                  <option key={option} value={option}>
                    {/* On a list, "no amount" is what a bare item means. */}
                    {option === 'none'
                      ? 'no amount'
                      : UNIT_OPTION_LABELS[option]}
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
/*
 * A list item is stored canonically, so this is the whole set: grams,
 * millilitres and the counts. Labels come from the shared map rather than
 * being written out again, which is how this one ended up saying "ml"
 * after the rest of the app moved to the cursive ell.
 */
const CANONICAL_UNITS: Unit[] = ['g', 'ml', 'item', 'tin', 'pack', 'none']

function canonicalLabel(unit: Unit): string {
  // On a list, an item with no amount is not "to taste", it is just an item.
  return unit === 'none' ? 'no amount' : UNIT_OPTION_LABELS[unit]
}

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
        if (!name.trim()) {
          return
        }
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
              {CANONICAL_UNITS.map((option) => (
                <option key={option} value={option}>
                  {canonicalLabel(option)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="flex gap-3">
        <ConfirmButton
          title="Delete this item?"
          description={`“${item.name}” will be permanently deleted from this list.`}
          confirmLabel="Delete item"
          className="flex-1"
          onConfirm={onDelete}
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </ConfirmButton>
        <Button type="submit" variant="accent" className="flex-1">
          Save
        </Button>
      </div>
    </form>
  )
}
