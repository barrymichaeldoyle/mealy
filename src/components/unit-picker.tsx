import { useId, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Checkbox } from './ui/checkbox'
import { Logo } from './ui/logo'
import {
  UNIT_OPTION_LABELS,
  UNIT_SYSTEMS,
  UNIT_SYSTEM_LABELS,
  UNIT_SYSTEM_UNITS,
  UNIVERSAL_UNITS,
  type Unit,
  type UnitSystem,
} from '../lib/units'
import {
  useNeedsUnitSetup,
  useSetUnitSystems,
  useUnitSystems,
} from '../hooks/use-household'
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
                  : 'border-paper-300 bg-paper-50 hover:bg-paper-100',
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
  const needsSetup = useNeedsUnitSetup()
  const onJoinScreen = useRouterState({
    select: (state) => state.location.pathname.startsWith('/join'),
  })

  return needsSetup && !onJoinScreen ? <UnitSetup /> : children
}

/** The household screen's copy of the question, for changing the answer. */
export function UnitSystemCard() {
  const saved = useUnitSystems()
  const setSystems = useSetUnitSystems()
  const [draft, setDraft] = useState<UnitSystem[] | null>(null)
  const systems = draft ?? [...saved]
  const dirty =
    systems.length > 0 &&
    UNIT_SYSTEMS.some(
      (system) => systems.includes(system) !== saved.includes(system),
    )

  return (
    <Card className="p-5">
      <h2 className="font-serif text-title font-medium text-ink-900">
        Measurements
      </h2>
      <p className="mt-1 mb-3 text-meta text-ink-400">
        What the unit picker offers when you write a recipe. Recipes you have
        already saved keep the units they were written in.
      </p>
      <UnitSystemChoice value={systems} onChange={setDraft} />
      <div className="mt-3 flex items-center justify-between gap-3">
        <UnitSystemFootnote />
        <Button
          disabled={!dirty}
          className="shrink-0"
          onClick={async () => {
            await setSystems({ systems })
            setDraft(null)
          }}
        >
          Save
        </Button>
      </div>
    </Card>
  )
}
