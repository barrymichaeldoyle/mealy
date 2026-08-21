import { Outlet, createFileRoute } from '@tanstack/react-router'
import {
  ClerkLoaded,
  RedirectToSignIn,
  Show,
} from '@clerk/tanstack-react-start'
import { AppNav } from '../components/bottom-nav'
import { UnitSetupGate } from '../components/unit-picker'
import { useHouseholdBootstrap } from '../hooks/use-household'

export const Route = createFileRoute('/_app')({ component: AppLayout })

/**
 * Everything below this layout requires a signed-in user, and shares the
 * bottom tab bar (sidebar on desktop).
 */
function AppLayout() {
  return (
    <ClerkLoaded>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <HouseholdBootstrap />
        <UnitSetupGate>
          <div className="app-shell-content md:pl-64">
            <Outlet />
          </div>
          <AppNav />
        </UnitSetupGate>
      </Show>
    </ClerkLoaded>
  )
}

/** Renders nothing: it exists to make sure the user has a household. */
function HouseholdBootstrap() {
  useHouseholdBootstrap()
  return null
}
