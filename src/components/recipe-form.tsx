import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Field, Input, Select, Textarea } from './ui/field'
import { UNITS, type Unit } from '../lib/units'
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
  description?: string
  servings: number
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  tags: string[]
  ingredients: {
    name: string
    quantity?: number
    unit: Unit
    note?: string
  }[]
  steps: string[]
}

let keySeed = 0
const nextKey = () => `k${keySeed++}`

export function emptyIngredient(): IngredientDraft {
  return { key: nextKey(), name: '', quantity: '', unit: 'g', note: '' }
}

export function emptyStep() {
  return { key: nextKey(), text: '' }
}

export function emptyRecipeDraft(): RecipeDraft {
  return {
    title: '',
    description: '',
    servings: '2',
    prepTimeMinutes: '',
    cookTimeMinutes: '',
    tags: '',
    ingredients: [emptyIngredient()],
    steps: [emptyStep()],
  }
}

const UNIT_OPTIONS: { value: Unit; label: string }[] = UNITS.map((unit) => ({
  value: unit,
  label:
    unit === 'none'
      ? 'to taste'
      : unit === 'item'
        ? 'item(s)'
        : unit === 'tin'
          ? 'tin(s)'
          : unit === 'pack'
            ? 'pack(s)'
            : unit,
}))

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

export type FormErrors = Partial<Record<'title' | 'servings' | 'form', string>>

/** Client-side mirror of `validateRecipe`: fast feedback, not the gate. */
export function draftToPayload(draft: RecipeDraft): {
  payload?: RecipePayload
  errors: FormErrors
} {
  const errors: FormErrors = {}

  const title = draft.title.trim()
  if (!title) errors.title = 'Give your recipe a name'

  const servings = Number(draft.servings)
  if (!Number.isFinite(servings) || servings < 1 || servings > 100) {
    errors.servings = 'Servings must be between 1 and 100'
  }

  const ingredients = draft.ingredients
    .filter((ingredient) => ingredient.name.trim())
    .map((ingredient) => ({
      name: ingredient.name.trim(),
      quantity:
        ingredient.unit === 'none'
          ? undefined
          : optionalNumber(ingredient.quantity),
      unit: ingredient.unit,
      note: ingredient.note.trim() || undefined,
    }))

  if (ingredients.some((i) => i.quantity !== undefined && i.quantity <= 0)) {
    errors.form = 'Quantities must be greater than zero'
  }

  if (Object.keys(errors).length > 0) return { errors }

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
  const formRef = useRef<HTMLFormElement>(null)

  /*
   * The action bar is sticky at the foot of a long form, so a failed submit
   * would otherwise flag a field the user cannot see. Move them to it.
   */
  useEffect(() => {
    if (Object.keys(errors).length === 0) return
    const target = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-form-error]',
    )
    if (!target) return
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [errors])

  const patch = (changes: Partial<RecipeDraft>) =>
    setDraft((current) => ({ ...current, ...changes }))

  const patchIngredient = (key: string, changes: Partial<IngredientDraft>) =>
    patch({
      ingredients: draft.ingredients.map((ingredient) =>
        ingredient.key === key ? { ...ingredient, ...changes } : ingredient,
      ),
    })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const { payload, errors: found } = draftToPayload(draft)
    setErrors(found)
    if (!payload) return

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

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-6"
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
          className="text-lg font-semibold text-stone-900"
        >
          Ingredients
        </h2>

        <ul className="space-y-3">
          {draft.ingredients.map((ingredient, index) => (
            <li key={ingredient.key}>
              <Card className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-400">
                    Ingredient {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        ingredients: draft.ingredients.filter(
                          (i) => i.key !== ingredient.key,
                        ),
                      })
                    }
                    aria-label={`Remove ingredient ${index + 1}`}
                    className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>

                <Field label="Name">
                  {(id) => (
                    <Input
                      id={id}
                      value={ingredient.name}
                      onChange={(event) =>
                        patchIngredient(ingredient.key, {
                          name: event.target.value,
                        })
                      }
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
                        disabled={ingredient.unit === 'none'}
                        value={ingredient.quantity}
                        onChange={(event) =>
                          patchIngredient(ingredient.key, {
                            quantity: event.target.value,
                          })
                        }
                        placeholder="250"
                      />
                    )}
                  </Field>
                  <Field label="Unit">
                    {(id) => (
                      <Select
                        id={id}
                        value={ingredient.unit}
                        onChange={(event) =>
                          patchIngredient(ingredient.key, {
                            unit: event.target.value as Unit,
                          })
                        }
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

                <Field label="Note" hint="Optional, e.g. finely chopped">
                  {(id) => (
                    <Input
                      id={id}
                      value={ingredient.note}
                      onChange={(event) =>
                        patchIngredient(ingredient.key, {
                          note: event.target.value,
                        })
                      }
                      autoComplete="off"
                    />
                  )}
                </Field>
              </Card>
            </li>
          ))}
        </ul>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            patch({ ingredients: [...draft.ingredients, emptyIngredient()] })
          }
        >
          <Plus className="size-4" aria-hidden="true" />
          Add ingredient
        </Button>
      </section>

      <section aria-labelledby="steps-heading" className="space-y-3">
        <h2 id="steps-heading" className="text-lg font-semibold text-stone-900">
          Method
        </h2>

        <ol className="space-y-3">
          {draft.steps.map((step, index) => (
            <li key={step.key}>
              <Card className="flex items-start gap-2 p-3">
                <span
                  className="mt-2.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700"
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
                  className="mt-1.5 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"
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

      {errors.form && (
        <p
          data-form-error
          tabIndex={-1}
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {errors.form}
        </p>
      )}

      <div
        className={cn(
          'sticky bottom-0 -mx-4 flex gap-3 border-t border-stone-200',
          'bg-stone-50/95 px-4 py-3 backdrop-blur',
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
