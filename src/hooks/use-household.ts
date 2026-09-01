import { useEffect, useRef } from 'react'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { useUser } from '@clerk/tanstack-react-start'
import { api } from '../../convex/_generated/api'
import { defined } from '../../convex/lib/optional'
import {
  DEFAULT_UNIT_SYSTEMS,
  defaultUnitFor,
  isUniversalUnit,
  unitsForChoice,
  unitsForSystems,
  type Unit,
} from '../lib/units'

export function useHousehold() {
  return useQuery(api.households.current)
}

export function useInvitePreview(token: string | undefined) {
  return useQuery(api.households.invite, token ? { token } : 'skip')
}

export function useSetUnitSystems() {
  return useMutation(api.households.setUnitSystems)
}

export function useSetUnits() {
  return useMutation(api.households.setUnits)
}

export type UnitSetupState = 'unknown' | 'needed' | 'answered'

/**
 * Whether the measurement question still has to be asked.
 *
 * `unknown` covers both waiting on the query and waiting on the bootstrap to
 * make the household, and the gate shows nothing for it. Treating either as
 * "not needed" rendered the app first and replaced it a beat later, which
 * read as the app breaking rather than a question arriving.
 */
export function useUnitSetupState(): UnitSetupState {
  const household = useHousehold()
  if (household === undefined || household === null) {
    return 'unknown'
  }
  return household.household.unitSystems === undefined ? 'needed' : 'answered'
}

/**
 * The units this household has chosen, one by one.
 *
 * A household that answered before the granular list existed has only its
 * systems, so those stand in: everything the preset offers. Universal units
 * are not in here, since nothing chooses them.
 */
export function useChosenUnits(): Unit[] {
  const household = useHousehold()
  const chosen = household?.household.units
  return (
    chosen ??
    unitsForSystems(household?.household.unitSystems ?? DEFAULT_UNIT_SYSTEMS)
  ).filter((unit) => !isUniversalUnit(unit))
}

/**
 * The units to offer in a picker. `keep` holds units already chosen on the
 * rows being edited, so an imported recipe stays editable whatever the
 * household has since turned off.
 */
export function useUnitOptions(keep: readonly Unit[] = []): {
  units: Unit[]
  defaultUnit: Unit
  /**
   * False while the household query is still in flight. Until it resolves
   * the units below are the metric fallback, which is the wrong list for an
   * imperial kitchen, so a caller showing a picker waits for this.
   */
  ready: boolean
} {
  const household = useHousehold()
  const chosen = useChosenUnits()
  return {
    units: unitsForChoice(chosen, keep),
    defaultUnit: defaultUnitFor(chosen),
    ready: household !== undefined,
  }
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
