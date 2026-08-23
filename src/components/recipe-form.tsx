import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Field, Input, Select, Textarea } from './ui/field'
import { ListRows } from './ui/list-row'
import { SkeletonList } from './ui/skeleton'
import { Sheet } from './ui/sheet'
import {
  UNIT_OPTION_LABELS,
  formatEquivalent,
  formatRecipeQuantity,
  type Unit,
  type UnitSystem,
} from '../lib/units'
import { useUnitOptions, useUnitSystems } from '../hooks/use-household'
import { defined, type Defined } from '../../convex/lib/optional'
import { cn } from '../lib/cn'

export type IngredientDraft = {
  key: string
  name: string
  quantity: string
  unit: Unit
  note: string
}

export type RecipeDraft = {
  title: string
  description: string
  servings: string
  prepTimeMinutes: string
  cookTimeMinutes: string
  tags: string
  ingredients: IngredientDraft[]
  steps: { key: string; text: string }[]
}

export type RecipePayload = {
  title: string
  description?: string | undefined
  servings: number
  prepTimeMinutes?: number | undefined
  cookTimeMinutes?: number | undefined
  tags: string[]
  ingredients: Defined<{
    name: string
    quantity?: number | undefined
    unit: Unit
    note?: string | undefined
  }>[]
  steps: string[]
}

let keySeed = 0
const nextKey = () => `k${keySeed++}`

function emptyIngredient(unit: Unit): IngredientDraft {
  return { key: nextKey(), name: '', quantity: '', unit, note: '' }
}

function emptyStep() {
  return { key: nextKey(), text: '' }
}

/**
 * No ingredient row to begin with. One is added through the sheet, which is
 * also where the household's default unit is picked up, so the blank form
 * no longer has to wait for the household to load.
 */
export function emptyRecipeDraft(): RecipeDraft {
  return {
    title: '',
    description: '',
    servings: '',
    prepTimeMinutes: '',
    cookTimeMinutes: '',
    tags: '',
    ingredients: [],
    steps: [emptyStep()],
  }
}

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

export type FormErrors = Partial<Record<'title' | 'servings' | 'form', string>>

/**
 * Which ingredient the sheet is holding. A new one is carried in the state
 * rather than appended to the draft, so cancelling leaves nothing behind.
 */
type SheetState =
  | { mode: 'new'; ingredient: IngredientDraft }
  | { mode: 'edit'; key: string }
  | null

/** Client-side mirror of `validateRecipe`: fast feedback, not the gate. */
function draftToPayload(draft: RecipeDraft): {
  payload?: RecipePayload
  errors: FormErrors
} {
  const errors: FormErrors = {}

  const title = draft.title.trim()
  if (!title) {
    errors.title = 'Give your recipe a name'
  }

  const servings = Number(draft.servings)
  if (!Number.isFinite(servings) || servings < 1 || servings > 100) {
    errors.servings = 'Servings must be between 1 and 100'
  }

  const ingredients = draft.ingredients
    .filter((ingredient) => ingredient.name.trim())
    .map((ingredient) =>
      defined({
        name: ingredient.name.trim(),
        quantity:
          ingredient.unit === 'none'
            ? undefined
            : optionalNumber(ingredient.quantity),
        unit: ingredient.unit,
        note: ingredient.note.trim() || undefined,
      }),
    )

  if (ingredients.some((i) => i.quantity !== undefined && i.quantity <= 0)) {
    errors.form = 'Quantities must be greater than zero'
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  return {
    errors,
    payload: {
      title,
      description: draft.description.trim() || undefined,
      servings,
      prepTimeMinutes: optionalNumber(draft.prepTimeMinutes),
      cookTimeMinutes: optionalNumber(draft.cookTimeMinutes),
      tags: draft.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      ingredients,
      steps: draft.steps.map((step) => step.text.trim()).filter(Boolean),
    },
  }
}

/**
 * Spoons and cups say nothing about how much to buy, so the amount is said
 * again in the household's own units as they type. Absent when the unit
 * already is one of theirs.
 */
function IngredientEquivalent({
  quantity,
  unit,
  systems,
}: {
  quantity: string
  unit: Unit
  systems: readonly UnitSystem[]
}) {
  const parsed = Number(quantity.trim())
  const equivalent =
    quantity.trim() && Number.isFinite(parsed) && parsed > 0
      ? formatEquivalent(parsed, unit, systems)
      : null

  if (!equivalent) {
    return null
  }
  return <p className="-mt-1 text-meta text-ink-400">That is {equivalent}.</p>
}

/** The amount as the recipe will read it, for the summary row. */
function rowAmount(ingredient: IngredientDraft): string {
  const parsed = Number(ingredient.quantity.trim())
  const quantity =
    ingredient.quantity.trim() && Number.isFinite(parsed) ? parsed : undefined
  return formatRecipeQuantity(quantity, ingredient.unit)
}

/**
 * One ingredient at a time. Four fields per row down the page turned a
 * ten-ingredient recipe into several screens of form, and nothing on screen
 * said which row you were meant to be looking at.
 *
 * Mounted fresh for each ingredient, so the fields start on that row's
 * values without an effect to copy them across.
 */
function IngredientSheet({
  open,
  initial,
  units,
  systems,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean
  initial: IngredientDraft
  units: Unit[]
  systems: readonly UnitSystem[]
  onSave: (ingredient: IngredientDraft) => void
  onDelete: (() => void) | undefined
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | undefined>(undefined)

  const set = (changes: Partial<IngredientDraft>) =>
    setValue((current) => ({ ...current, ...changes }))

  function save() {
    if (!value.name.trim()) {
      setError('Give the ingredient a name')
      return
    }
    const parsed = Number(value.quantity.trim())
    if (value.quantity.trim() && (!Number.isFinite(parsed) || parsed <= 0)) {
      setError('The amount must be greater than zero')
      return
    }
    onSave({ ...value, name: value.name.trim(), note: value.note.trim() })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={onDelete ? 'Edit ingredient' : 'Add an ingredient'}
    >
      <div className="space-y-4">
        <Field label="Name" error={error}>
          {(id) => (
            <Input
              id={id}
              value={value.name}
              onChange={(event) => {
                setError(undefined)
                set({ name: event.target.value })
              }}
              placeholder="tin tomatoes"
              autoComplete="off"
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                disabled={value.unit === 'none'}
                value={value.quantity}
                onChange={(event) => {
                  setError(undefined)
                  set({ quantity: event.target.value })
                }}
                placeholder="250"
              />
            )}
          </Field>
          <Field label="Unit">
            {(id) => (
              <Select
                id={id}
                value={value.unit}
                onChange={(event) => set({ unit: event.target.value as Unit })}
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {UNIT_OPTION_LABELS[unit]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <IngredientEquivalent
          quantity={value.quantity}
          unit={value.unit}
          systems={systems}
        />

        <Field label="Note" hint="Optional, e.g. finely chopped">
          {(id) => (
            <Input
              id={id}
              value={value.note}
              onChange={(event) => set({ note: event.target.value })}
              placeholder="finely chopped"
              autoComplete="off"
            />
          )}
        </Field>

        <div className="flex gap-3 pt-1">
          {onDelete && (
            <Button variant="danger" className="flex-1" onClick={onDelete}>
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
            </Button>
          )}
          <Button variant="accent" className="flex-1" onClick={save}>
            Done
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

export function RecipeForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: RecipeDraft
  submitLabel: string
  onSubmit: (payload: RecipePayload) => Promise<void>
  onCancel?: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [sheet, setSheet] = useState<SheetState>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const systems = useUnitSystems()
  // A recipe already written in a unit the household has since switched off
  // keeps offering it, so editing the row cannot silently change what it says.
  const { units, defaultUnit, ready } = useUnitOptions(
    draft.ingredients.map((ingredient) => ingredient.unit),
  )

  const editing =
    sheet?.mode === 'edit'
      ? draft.ingredients.find((item) => item.key === sheet.key)
      : undefined
  // A row deleted from under an open sheet closes it rather than stranding it.
  const sheetIngredient =
    sheet?.mode === 'new'
      ? sheet.ingredient
      : sheet?.mode === 'edit'
        ? editing
        : undefined

  /*
   * The action bar is sticky at the foot of a long form, so a failed submit
   * would otherwise flag a field the user cannot see. Move them to it.
   */
  useEffect(() => {
    if (Object.keys(errors).length === 0) {
      return
    }
    const target = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-form-error]',
    )
    if (!target) {
      return
    }
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [errors])

  const patch = (changes: Partial<RecipeDraft>) =>
    setDraft((current) => ({ ...current, ...changes }))

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const { payload, errors: found } = draftToPayload(draft)
    setErrors(found)
    if (!payload) {
      return
    }

    setSaving(true)
    try {
      await onSubmit(payload)
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Something went wrong',
      })
    } finally {
      setSaving(false)
    }
  }

  /*
   * The unit picker is only right once the household has answered, and the
   * fallback until then is metric. Waiting here rather than in each route
   * means neither has to remember, and the draft survives: the component
   * stays mounted, it just has nothing to show yet.
   */
  if (!ready) {
    return <SkeletonList rows={4} />
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="form-sticky-actions space-y-6"
      noValidate
    >
      <Card className="space-y-4 p-4">
        <Field label="Recipe name" error={errors.title}>
          {(id) => (
            <Input
              id={id}
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Bobotie"
              autoComplete="off"
              required
            />
          )}
        </Field>

        <Field label="Description" hint="Optional, one line is plenty.">
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={draft.description}
              onChange={(event) => patch({ description: event.target.value })}
              placeholder="Weeknight favourite, freezes well"
            />
          )}
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Serves" error={errors.servings}>
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={draft.servings}
                onChange={(event) => patch({ servings: event.target.value })}
                placeholder="4"
              />
            )}
          </Field>
          <Field label="Prep (min)">
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.prepTimeMinutes}
                onChange={(event) =>
                  patch({ prepTimeMinutes: event.target.value })
                }
                placeholder="15"
              />
            )}
          </Field>
          <Field label="Cook (min)">
            {(id) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.cookTimeMinutes}
                onChange={(event) =>
                  patch({ cookTimeMinutes: event.target.value })
                }
                placeholder="45"
              />
            )}
          </Field>
        </div>

        <Field label="Tags" hint="Comma separated, e.g. pasta, chicken, quick">
          {(id) => (
            <Input
              id={id}
              value={draft.tags}
              onChange={(event) => patch({ tags: event.target.value })}
              placeholder="mince, comfort food"
              autoComplete="off"
            />
          )}
        </Field>
      </Card>

      <section aria-labelledby="ingredients-heading" className="space-y-3">
        <h2
          id="ingredients-heading"
          className="font-serif text-title font-medium text-ink-900"
        >
          Ingredients
        </h2>

        {draft.ingredients.length === 0 ? (
          <Card className="px-4 py-6 text-center">
            <p className="text-body text-ink-400">
              No ingredients yet. Add the first one below.
            </p>
          </Card>
        ) : (
          /*
           * The same shape the recipe itself uses, so the form shows what it
           * is building rather than a wall of inputs. Tapping a row opens it.
           */
          <Card className="overflow-hidden">
            <ListRows>
              {draft.ingredients.map((ingredient) => (
                <button
                  key={ingredient.key}
                  type="button"
                  onClick={() =>
                    setSheet({ mode: 'edit', key: ingredient.key })
                  }
                  className={cn(
                    'flex min-h-[52px] w-full items-center gap-3 px-4 py-2',
                    'text-left transition-colors duration-150 ease-out',
                    'hover:bg-paper-200 focus-visible:outline-2',
                    'focus-visible:-outline-offset-2 focus-visible:outline-basil-700',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-pretty break-words text-body text-ink-900">
                      {ingredient.name || 'Unnamed ingredient'}
                    </span>
                    {ingredient.note && (
                      <span className="block text-pretty break-words text-meta text-ink-400">
                        {ingredient.note}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-body font-semibold text-ink-600 tabular-nums">
                    {rowAmount(ingredient)}
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-ink-400"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </ListRows>
          </Card>
        )}

        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            setSheet({ mode: 'new', ingredient: emptyIngredient(defaultUnit) })
          }
        >
          <Plus className="size-4" aria-hidden="true" />
          Add ingredient
        </Button>
      </section>

      <section aria-labelledby="steps-heading" className="space-y-3">
        <h2
          id="steps-heading"
          className="font-serif text-title font-medium text-ink-900"
        >
          Method
        </h2>

        <ol className="space-y-3">
          {draft.steps.map((step, index) => (
            <li key={step.key}>
              <Card className="flex items-start gap-2 p-3">
                <span
                  className="mt-3 shrink-0 text-title font-semibold text-basil-700 tabular-nums"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <Textarea
                  rows={2}
                  aria-label={`Step ${index + 1}`}
                  value={step.text}
                  onChange={(event) =>
                    patch({
                      steps: draft.steps.map((s) =>
                        s.key === step.key
                          ? { ...s, text: event.target.value }
                          : s,
                      ),
                    })
                  }
                  placeholder="Brown the mince over medium heat…"
                />
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      steps: draft.steps.filter((s) => s.key !== step.key),
                    })
                  }
                  aria-label={`Remove step ${index + 1}`}
                  className="mt-1.5 rounded-btn p-2 text-ink-400 hover:bg-paper-200 hover:text-danger-text"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </Card>
            </li>
          ))}
        </ol>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => patch({ steps: [...draft.steps, emptyStep()] })}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add step
        </Button>
      </section>

      {sheetIngredient && (
        <IngredientSheet
          // Remounts per ingredient, so the fields always start on its values.
          key={sheetIngredient.key}
          open
          initial={sheetIngredient}
          units={units}
          systems={systems}
          onClose={() => setSheet(null)}
          onSave={(ingredient) => {
            patch({
              ingredients:
                sheet?.mode === 'new'
                  ? [...draft.ingredients, ingredient]
                  : draft.ingredients.map((item) =>
                      item.key === ingredient.key ? ingredient : item,
                    ),
            })
            setSheet(null)
          }}
          onDelete={
            sheet?.mode === 'edit'
              ? () => {
                  patch({
                    ingredients: draft.ingredients.filter(
                      (item) => item.key !== sheetIngredient.key,
                    ),
                  })
                  setSheet(null)
                }
              : undefined
          }
        />
      )}

      {errors.form && (
        <p
          data-form-error
          tabIndex={-1}
          role="alert"
          className="rounded-card border border-tomato-600 px-4 py-3 text-body font-medium text-danger-text"
        >
          {errors.form}
        </p>
      )}

      <div
        className={cn(
          'sticky bottom-0 -mx-4 flex gap-3 bg-paper-50/95 px-4 py-3',
          'shadow-[0_-1px_0_var(--color-paper-200)] backdrop-blur',
        )}
      >
        {onCancel && (
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="accent"
          className="flex-1"
          disabled={saving}
        >
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
