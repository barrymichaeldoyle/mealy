import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ConvexError } from 'convex/values'
import { CheckCheck, Hourglass, House, Unlink } from 'lucide-react'
import { AppHeader } from '../../components/app-header'
import { Button, buttonClass } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { ConfirmButton } from '../../components/ui/confirm-button'
import { EmptyState } from '../../components/ui/empty-state'
import { SkeletonList } from '../../components/ui/skeleton'
import {
  useAcceptInvite,
  useDisplayName,
  useInvitePreview,
} from '../../hooks/use-household'
import { cn } from '../../lib/cn'
import { defined } from '../../../convex/lib/optional'

export const Route = createFileRoute('/_app/join/$token')({
  component: JoinScreen,
})

const DEAD_ENDS = {
  unknown: {
    icon: Unlink,
    title: 'That link is not valid',
    body: 'Ask for a fresh invite link and try again.',
  },
  expired: {
    icon: Hourglass,
    title: 'That link has expired',
    body: 'Invite links last a week. Ask for a new one.',
  },
  used: {
    icon: CheckCheck,
    title: 'That link has already been used',
    body: 'Each invite works once. Ask for a new one.',
  },
  'own-household': {
    icon: House,
    title: 'You are already in this household',
    body: 'Nothing to do. Your recipes are where you left them.',
  },
} as const

function JoinScreen() {
  const { token } = Route.useParams()
  const preview = useInvitePreview(token)

  return (
    <>
      <AppHeader title="Join a household" />
      <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav">
        {preview === undefined || preview === null ? (
          <SkeletonList rows={2} />
        ) : preview.status !== 'valid' || !preview.household ? (
          <EmptyState
            {...DEAD_ENDS[preview.status as keyof typeof DEAD_ENDS]}
            action={
              <Link to="/recipes" className={buttonClass('secondary', 'md')}>
                Back to my kitchen
              </Link>
            }
          />
        ) : (
          <JoinForm
            token={token}
            household={preview.household}
            mine={preview.mine}
          />
        )}
      </main>
    </>
  )
}

type Mine = {
  counts: { recipes: number; lists: number; plannedMeals: number }
  canMove: boolean
}

function JoinForm({
  token,
  household,
  mine,
}: {
  token: string
  household: { name: string; memberNames: string[] }
  mine: Mine | undefined
}) {
  const navigate = useNavigate()
  const accept = useAcceptInvite()
  const name = useDisplayName()
  const [moveData, setMoveData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const counts = mine?.counts ?? { recipes: 0, lists: 0, plannedMeals: 0 }
  const total = counts.recipes + counts.lists + counts.plannedMeals
  const canChoose = total > 0 && (mine?.canMove ?? false)
  const discards = canChoose && !moveData

  async function joinHousehold() {
    setBusy(true)
    setError(null)
    try {
      await accept({
        ...defined({ name }),
        token,
        moveData: canChoose ? moveData : false,
      })
      await navigate({ to: '/recipes' })
    } catch (thrown) {
      setError(
        thrown instanceof ConvexError
          ? String(thrown.data)
          : 'Could not join that household. Try again.',
      )
      throw thrown
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h1 className="font-serif text-display font-semibold text-ink-900">
          {household.name}
        </h1>
        <p className="mt-1 text-body text-ink-600">
          {household.memberNames.join(' and ')} invited you. Join and you both
          see the same recipes, plan and lists.
        </p>
      </Card>

      {canChoose && (
        <Card className="p-5">
          <h2 className="font-serif text-title font-medium text-ink-900">
            What about your own recipes?
          </h2>
          <p className="mt-1 text-body text-ink-600">
            You have {describe(counts)}.
          </p>
          <div className="mt-3 space-y-2">
            <Choice
              checked={moveData}
              onSelect={() => setMoveData(true)}
              title="Bring them with me"
              body="Everything you have moves into this household. You both see the lot."
            />
            <Choice
              checked={!moveData}
              onSelect={() => setMoveData(false)}
              title="Start fresh"
              body="Your own recipes, plans and lists are deleted when you join."
            />
          </div>
        </Card>
      )}

      {total > 0 && mine && !mine.canMove && (
        <Card className="p-5 text-body text-ink-600">
          You already share a household with someone else, so your recipes stay
          with them. Leave that household first if you want to bring them here.
        </Card>
      )}

      {error && (
        <p className="text-body font-medium text-danger-text" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {discards ? (
          <ConfirmButton
            variant="accent"
            size="lg"
            disabled={busy}
            title="Join and delete your kitchen?"
            description={`Joining ${household.name} with “Start fresh” permanently deletes ${describe(counts)} from your current kitchen.`}
            confirmLabel="Join and delete mine"
            onConfirm={joinHousehold}
          >
            Join {household.name}
          </ConfirmButton>
        ) : (
          <Button
            variant="accent"
            size="lg"
            disabled={busy}
            onClick={() => void joinHousehold().catch(() => undefined)}
          >
            {busy ? 'Joining…' : `Join ${household.name}`}
          </Button>
        )}
        <Link to="/recipes" className={buttonClass('secondary', 'lg')}>
          Not now
        </Link>
      </div>
    </div>
  )
}

function describe(counts: {
  recipes: number
  lists: number
  plannedMeals: number
}): string {
  const parts = [
    plural(counts.recipes, 'recipe'),
    plural(counts.plannedMeals, 'planned meal'),
    plural(counts.lists, 'shopping list'),
  ].filter(Boolean)
  if (parts.length === 1) {
    return parts[0]!
  }
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

function plural(count: number, noun: string): string {
  if (count === 0) {
    return ''
  }
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function Choice({
  checked,
  onSelect,
  title,
  body,
}: {
  checked: boolean
  onSelect: () => void
  title: string
  body: string
}) {
  return (
    <label
      aria-label={title}
      className={cn(
        'flex gap-3 rounded-card border px-4 py-3',
        'transition-colors duration-150 ease-out',
        checked
          ? 'border-basil-700 bg-basil-100'
          : 'border-paper-200 bg-paper-50',
      )}
    >
      <input
        type="radio"
        name="move-data"
        checked={checked}
        onChange={onSelect}
        className="mt-1.5 size-4 accent-basil-700"
      />
      <span className="min-w-0">
        <span className="block font-medium text-ink-900">{title}</span>
        <span className="block text-body text-ink-600">{body}</span>
      </span>
    </label>
  )
}
