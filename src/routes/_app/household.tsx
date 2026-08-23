import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useClerk } from '@clerk/tanstack-react-start'
import {
  Check,
  Copy,
  Download,
  Link2,
  Share2,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { AppHeader } from '../../components/app-header'
import { SiteFooter } from '../../components/site-footer'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { ConfirmButton } from '../../components/ui/confirm-button'
import { Field, Input } from '../../components/ui/field'
import { SkeletonList } from '../../components/ui/skeleton'
import { SaveNotice } from '../../components/ui/save-notice'
import { useSaveState } from '../../hooks/use-save-state'
import { UnitSystemCard } from '../../components/unit-picker'
import {
  useCreateInvite,
  useDisplayName,
  useExportData,
  useHousehold,
  useLeaveHousehold,
  useRemoveMember,
  useRenameHousehold,
  useRevokeInvite,
} from '../../hooks/use-household'
import type { Doc } from '../../../convex/_generated/dataModel'
import { defined } from '../../../convex/lib/optional'
import { downloadJson, exportFilename } from '../../lib/download'
import { CONTACT_EMAIL } from '../../lib/legal'

export const Route = createFileRoute('/_app/household')({
  component: HouseholdScreen,
})

function inviteUrl(token: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}/join/${token}`
}

function HouseholdScreen() {
  const household = useHousehold()

  return (
    <>
      <AppHeader title="Household" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 pt-4 pb-nav">
        {household === undefined || household === null ? (
          <SkeletonList rows={2} />
        ) : (
          <>
            <NameCard name={household.household.name} />
            <MembersCard
              members={household.members}
              meId={household.userId}
              isOwner={household.role === 'owner'}
            />
            <UnitSystemCard />
            <InviteCard
              token={household.inviteToken}
              expiresAt={household.inviteExpiresAt}
              householdName={household.household.name}
            />
            {household.members.length > 1 && <LeaveCard />}
            <DataCard />
          </>
        )}
        <SiteFooter />
      </main>
    </>
  )
}

function NameCard({ name }: { name: string }) {
  const rename = useRenameHousehold()
  const [draft, setDraft] = useState(name)
  const { status, error, save, reset } = useSaveState()
  const dirty = draft.trim() !== name

  return (
    <Card className="p-5">
      <Field label="Household name" hint="Everyone in it sees this name.">
        {(id) => (
          <div className="flex gap-2">
            <Input
              id={id}
              value={draft}
              maxLength={60}
              onChange={(event) => {
                reset()
                setDraft(event.target.value)
              }}
            />
            <Button
              disabled={!dirty || !draft.trim() || status === 'saving'}
              onClick={() => void save(() => rename({ name: draft }))}
            >
              {status === 'saving' ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </Field>
      <SaveNotice status={status} error={error} />
    </Card>
  )
}

function MembersCard({
  members,
  meId,
  isOwner,
}: {
  members: Doc<'householdMembers'>[]
  meId: string
  isOwner: boolean
}) {
  const removeMember = useRemoveMember()

  return (
    <Card className="p-5">
      <h2 className="font-serif text-title font-medium text-ink-900">
        {members.length === 1 ? 'Just you so far' : `${members.length} people`}
      </h2>
      <ul className="mt-3 divide-y divide-paper-200">
        {members.map((member) => (
          <li
            key={member._id}
            className="flex items-center gap-3 py-3 first:pt-0"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-basil-100 font-serif font-medium text-basil-700">
              {member.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-words font-medium text-ink-900">
                {member.name}
                {member.userId === meId && (
                  <span className="text-ink-400"> (you)</span>
                )}
              </span>
              <span className="text-meta text-ink-400 capitalize">
                {member.role}
              </span>
            </span>
            {isOwner && member.userId !== meId && (
              <ConfirmButton
                size="sm"
                title={`Remove ${member.name}?`}
                description={`${member.name} will lose access to this household and its recipes, plan and lists.`}
                confirmLabel="Remove person"
                onConfirm={() => removeMember({ memberId: member._id })}
              >
                Remove
              </ConfirmButton>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

/**
 * The invite link is the whole sharing story: send it, they open it signed
 * in, and from then on you both see the same kitchen.
 */
function InviteCard({
  token,
  expiresAt,
  householdName,
}: {
  token: string | null
  expiresAt: number | null
  householdName: string
}) {
  const createInvite = useCreateInvite()
  const revokeInvite = useRevokeInvite()
  const [copied, setCopied] = useState(false)
  // Read once on mount: the share sheet exists or it does not, and checking
  // during render would differ between the server and the browser.
  const [canShare, setCanShare] = useState(false)
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator)
  }, [])
  const [busy, setBusy] = useState(false)

  async function copy(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="p-5">
      <h2 className="font-serif text-title font-medium text-ink-900">
        Invite someone
      </h2>
      <p className="mt-1 text-body text-ink-600">
        Anyone who opens the link joins {householdName} and sees the same
        recipes, plan and lists as you.
      </p>

      {token ? (
        <div className="mt-4 space-y-3">
          {/*
           * Readonly rather than a paragraph, so the link can be selected,
           * tapped and held, and picked up by a password manager. A phone
           * had no way to get at it except the Copy button.
           */}
          <input
            readOnly
            value={inviteUrl(token)}
            aria-label="Invite link"
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-card border border-line bg-paper-50 px-3 py-2.5 font-mono text-meta text-ink-600"
          />
          <div className="flex flex-wrap gap-2">
            {canShare && (
              /* The share sheet is the natural way to send this on a phone. */
              <Button
                variant="accent"
                onClick={() =>
                  void navigator
                    .share({
                      title: `Join ${householdName} on Mealy`,
                      url: inviteUrl(token),
                    })
                    .catch(() => undefined)
                }
              >
                <Share2 className="size-4" aria-hidden="true" />
                Share link
              </Button>
            )}
            <Button
              variant={canShare ? 'secondary' : 'accent'}
              onClick={() => void copy(inviteUrl(token))}
            >
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button variant="secondary" onClick={() => void revokeInvite({})}>
              Cancel invite
            </Button>
          </div>
          {expiresAt && (
            <p className="text-meta text-ink-400">
              The link works once, and expires on{' '}
              {new Date(expiresAt).toLocaleDateString('en-ZA', {
                day: 'numeric',
                month: 'long',
              })}
              .
            </p>
          )}
        </div>
      ) : (
        <Button
          className="mt-4"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await createInvite({})
            } finally {
              setBusy(false)
            }
          }}
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Create invite link
        </Button>
      )}
    </Card>
  )
}

/**
 * The privacy policy offers a portable copy and a deletion route. This is
 * where a signed-in person actually finds them.
 */
function DataCard() {
  const exportData = useExportData()
  const clerk = useClerk()
  const [busy, setBusy] = useState(false)

  return (
    <Card className="p-5">
      <h2 className="font-serif text-title font-medium text-ink-900">
        Your data
      </h2>
      <p className="mt-1 text-body text-ink-600">
        Download everything in this kitchen as one file: the recipes, the plan
        and every list.
      </p>
      <Button
        className="mt-4"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            const data = await exportData()
            if (data) {
              downloadJson(exportFilename(new Date()), data)
            }
          } finally {
            setBusy(false)
          }
        }}
      >
        <Download className="size-4" aria-hidden="true" />
        {busy ? 'Preparing…' : 'Download my data'}
      </Button>
      <div className="mt-6 border-t border-paper-200 pt-5">
        <h3 className="font-serif text-title font-medium text-ink-900">
          Delete your account
        </h3>
        <p className="mt-1 text-meta text-ink-400">
          This kitchen goes with it, along with its recipes, plans and lists,
          unless somebody else is in it. Download your data first if you want to
          keep a copy.
        </p>
        {/*
         * This used to say to email us. Deleting is self-serve in the
         * account menu, and the webhook clears the kitchen behind it, so
         * asking people to write a letter about it was busywork and read as
         * though we might say no.
         */}
        <Button
          className="mt-3"
          variant="danger"
          onClick={() => clerk.openUserProfile()}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete account
        </Button>
        <p className="mt-3 text-meta text-ink-400">
          Something not right? Email{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="underline underline-offset-2 hover:text-ink-600"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </Card>
  )
}

function LeaveCard() {
  const leave = useLeaveHousehold()
  const name = useDisplayName()

  return (
    <Card className="p-5">
      <h2 className="font-serif text-title font-medium text-ink-900">
        Leave this household
      </h2>
      <p className="mt-1 text-body text-ink-600">
        You go back to a kitchen of your own. The recipes, plans and lists stay
        here with everyone else.
      </p>
      <ConfirmButton
        className="mt-4"
        title="Leave this household?"
        description="You will lose access to this household. Its recipes, plan and lists will stay with the other people here."
        confirmLabel="Leave household"
        onConfirm={() => leave(defined({ name }))}
      >
        <Link2 className="size-4" aria-hidden="true" />
        Leave household
      </ConfirmButton>
    </Card>
  )
}
