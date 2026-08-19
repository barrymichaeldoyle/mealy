import { useEffect, useRef } from 'react'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { useUser } from '@clerk/tanstack-react-start'
import { api } from '../../convex/_generated/api'
import { defined } from '../../convex/lib/optional'

export function useHousehold() {
  return useQuery(api.households.current)
}

export function useInvitePreview(token: string | undefined) {
  return useQuery(api.households.invite, token ? { token } : 'skip')
}

export function useRenameHousehold() {
  return useMutation(api.households.rename)
}

export function useCreateInvite() {
  return useMutation(api.households.createInvite)
}

export function useRevokeInvite() {
  return useMutation(api.households.revokeInvite)
}

export function useAcceptInvite() {
  return useMutation(api.households.acceptInvite)
}

export function useLeaveHousehold() {
  return useMutation(api.households.leave)
}

export function useRemoveMember() {
  return useMutation(api.households.removeMember)
}

/**
 * Fetched on the button press rather than subscribed to, since a copy of
 * everything is not worth keeping live in memory on every visit.
 */
export function useExportData() {
  const convex = useConvex()
  return () => convex.query(api.households.exportData, {})
}

/** The name we show other members, taken from Clerk. */
export function useDisplayName(): string | undefined {
  const { user } = useUser()
  return (
    user?.firstName ??
    user?.fullName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    undefined
  )
}

/**
 * Give every signed-in user a household. Queries cannot write, so the app
 * shell calls this once: a new user lands in a household of one, and an
 * existing member gets their display name refreshed from Clerk.
 */
export function useHouseholdBootstrap(): void {
  const { isSignedIn } = useUser()
  const household = useHousehold()
  const name = useDisplayName()
  const ensure = useMutation(api.households.ensureCurrent)
  const sent = useRef<string | null>(null)

  useEffect(() => {
    if (!isSignedIn || household === undefined) {
      return
    }

    const me = household?.members.find(
      (member) => member.userId === household.userId,
    )
    const needsWrite = !household || (name !== undefined && me?.name !== name)
    if (!needsWrite) {
      return
    }

    // One attempt per name, so a failure cannot spin.
    const attempt = name ?? ''
    if (sent.current === attempt) {
      return
    }
    sent.current = attempt
    void ensure(defined({ name }))
  }, [ensure, household, isSignedIn, name])
}
