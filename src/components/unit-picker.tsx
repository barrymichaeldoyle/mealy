import { useId, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { SaveNotice } from './ui/save-notice'
import { Checkbox } from './ui/checkbox'
import { Logo } from './ui/logo'
import {
  UNITS,
  UNIT_GROUPS,
  UNIT_OPTION_LABELS,
  UNIT_SYSTEMS,
  UNIT_SYSTEM_LABELS,
  UNIT_SYSTEM_UNITS,
  UNIVERSAL_UNITS,
  isUniversalUnit,
  unitsForSystems,
  type Unit,
  type UnitSystem,
} from '../lib/units'
import {
  useChosenUnits,
  useSetUnitSystems,
  useSetUnits,
  useUnitSetupState,
} from '../hooks/use-household'
import { chipClass } from './ui/chip'
import { useSaveState } from '../hooks/use-save-state'
import { cn } from '../lib/cn'

function unitList(units: readonly Unit[]): string {
  return units.map((unit) => UNIT_OPTION_LABELS[unit]).join(' · ')
}

/**
 * The two measurement systems as tick-boxes. Teaspoons, tablespoons and cups
 * sit under both, because a metric kitchen still measures baking powder in
 * teaspoons and the amount converts either way.
 */
function UnitSystemChoice({
  value,
  onChange,
}: {
  value: readonly UnitSystem[]
  onChange: (systems: UnitSystem[]) => void
}) {
  const groupId = useId()
  return (
    <ul className="space-y-3">
      {UNIT_SYSTEMS.map((system) => {
        const checked = value.includes(system)
        return (
          <li key={system}>
            <label
              htmlFor={`${groupId}-${system}`}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-card border p-4',
                'transition-colors duration-150 ease-out',
                checked
                  ? 'border-basil-700 bg-basil-100/40'
                  : 'border-line bg-paper-50 hover:bg-paper-100',
              )}
            >
              <Checkbox
                id={`${groupId}-${system}`}
                checked={checked}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...value, system]
                      : value.filter((held) => held !== system),
                  )
                }
              />
              <span className="min-w-0">
                <span className="block font-medium text-body text-ink-900">
                  {UNIT_SYSTEM_LABELS[system]}
                </span>
                <span className="mt-0.5 block text-meta text-ink-400">
                  {unitList(UNIT_SYSTEM_UNITS[system])}
                </span>
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

/** The line that stops "where did item and tin go?" being a question. */
function UnitSystemFootnote() {
  return (
    <p className="text-meta text-ink-400">
      {unitList(UNIVERSAL_UNITS)} are always offered, whatever you pick.
    </p>
  )
}

/**
 * The first-run question, shown over the app until it is answered. Existing
 * households get it too: nobody has answered for them either.
 *
 * Nothing already saved changes when the answer changes. A recipe written in
 * ounces still says ounces, the unit simply stops being offered on new rows.
 */
function UnitSetup() {
  const setSystems = useSetUnitSystems()
  const [systems, setChoice] = useState<UnitSystem[]>(['metric'])
  const [saving, setSaving] = useState(false)

  return (
    <div className="min-h-dvh bg-paper-50">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
        <Logo className="mb-6 h-8 self-start" />
        <h1 className="font-serif text-display font-semibold text-ink-900">
          How do you measure?
        </h1>
        <p className="mt-2 text-body text-ink-600">
          Pick what you use in the kitchen. The rest stay out of the way when
          you write a recipe.
        </p>

        <form
          className="mt-6 space-y-5"
          onSubmit={async (event) => {
            event.preventDefault()
            if (systems.length === 0) {
              return
            }
            setSaving(true)
            try {
              await setSystems({ systems })
            } finally {
              setSaving(false)
            }
          }}
        >
          <UnitSystemChoice value={systems} onChange={setChoice} />
          <UnitSystemFootnote />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={systems.length === 0 || saving}
          >
            {saving ? 'Saving…' : 'Save and carry on'}
          </Button>
          <p className="text-center text-meta text-ink-400">
            You can change this later on the Household screen.
          </p>
        </form>
      </div>
    </div>
  )
}

/**
 * Shows the setup question in place of the app until the household answers
 * it. It replaces the shell rather than covering it, so there is nothing
 * behind it to tab into.
 *
 * The join screen is exempt: someone opening an invite link is on their way
 * into a household that may have answered already, and a question about the
 * household of one they are about to leave would be the wrong one to ask.
 */
export function UnitSetupGate({ children }: { children: React.ReactNode }) {
  const setupState = useUnitSetupState()
  const onJoinScreen = useRouterState({
    select: (state) => state.location.pathname.startsWith('/join'),
  })

  if (onJoinScreen) {
    return children
  }
  // Nothing, rather than the app, until we know which of the two it is.
  if (setupState === 'unknown') {
    return null
  }
  return setupState === 'needed' ? <UnitSetup /> : children
}

/**
 * The household screen's copy of the question, unit by unit.
 *
 * A system is a preset here rather than the answer: tapping Metric ticks
 * everything metric, and then you turn off the ones you never use. A kitchen
 * that weighs in grams and buys milk in pints is a real kitchen, and the two
 * tick-boxes could not describe it.
 */
export function UnitSystemCard() {
  const saved = useChosenUnits()
  const setUnits = useSetUnits()
  const [draft, setDraft] = useState<Unit[] | null>(null)
  const { status, error, save, reset } = useSaveState()
  const units = draft ?? saved
  const dirty =
    units.length > 0 &&
    UNITS.some((unit) => units.includes(unit) !== saved.includes(unit))

  function change(next: Unit[]) {
    reset()
    setDraft(next)
  }

  return (
    <Card className="p-5">
      <h2 className="font-serif text-title font-medium text-ink-900">
        Measurements
      </h2>
      <p className="mt-1 text-meta text-ink-400">
        What the unit picker offers when you write a recipe. Anything you turn
        off still gets read out in the units you keep, so a recipe in cups is
        never a sum you have to do. Recipes you have already saved keep the
        units they were written in.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-meta font-medium text-ink-600">Start from</span>
        {UNIT_SYSTEMS.map((system) => (
          <button
            key={system}
            type="button"
            onClick={() =>
              change(
                unitsForSystems([system]).filter(
                  (unit) => !isUniversalUnit(unit),
                ),
              )
            }
            className={chipClass(
              false,
              'min-h-[36px] px-4 hover:border-basil-700 hover:bg-basil-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700',
            )}
          >
            {UNIT_SYSTEM_LABELS[system]}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            change(
              unitsForSystems([...UNIT_SYSTEMS]).filter(
                (unit) => !isUniversalUnit(unit),
              ),
            )
          }
          className={chipClass(
            false,
            'min-h-[36px] px-4 hover:border-basil-700 hover:bg-basil-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700',
          )}
        >
          Both
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {UNIT_GROUPS.map((group) => (
          <fieldset key={group.label}>
            <legend className="text-meta font-semibold text-ink-600">
              {group.label}
            </legend>
            <ul className="mt-2 flex flex-wrap gap-2">
              {group.units.map((unit) => {
                const checked = units.includes(unit)
                return (
                  <li key={unit}>
                    <label
                      htmlFor={`unit-${unit}`}
                      className={cn(
                        'flex min-h-[44px] cursor-pointer items-center gap-2',
                        'rounded-card border px-3',
                        'transition-colors duration-150 ease-out',
                        checked
                          ? 'border-basil-700 bg-basil-100/40'
                          : 'border-line bg-paper-50 hover:bg-paper-100',
                      )}
                    >
                      <Checkbox
                        id={`unit-${unit}`}
                        checked={checked}
                        onChange={(event) =>
                          change(
                            event.target.checked
                              ? [...units, unit]
                              : units.filter((held) => held !== unit),
                          )
                        }
                      />
                      <span className="text-body text-ink-900">
                        {UNIT_OPTION_LABELS[unit]}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <UnitSystemFootnote />
        <Button
          disabled={!dirty || status === 'saving'}
          className="shrink-0"
          // The household name has a Save button too, so this one says which.
          aria-label="Save measurements"
          /*
           * The draft is not cleared on success. Clearing it handed the
           * tick-boxes back to `saved`, and between the write landing and
           * the query catching up that is the value you just replaced, so
           * the card briefly showed the old answer as if the save had not
           * happened. `saved` catching up turns `dirty` false on its own.
           */
          onClick={() => void save(() => setUnits({ units }))}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </Button>
      </div>
      <SaveNotice status={status} error={error} />
    </Card>
  )
}
