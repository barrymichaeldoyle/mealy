import { Outlet, createFileRoute } from '@tanstack/react-router'
import {
  ClerkLoaded,
  RedirectToSignIn,
  Show,
} from '@clerk/tanstack-react-start'
import { AppNav } from '../components/bottom-nav'
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
        <div className="md:pl-56">
          <Outlet />
        </div>
        <AppNav />
      </Show>
    </ClerkLoaded>
  )
}

/** Renders nothing: it exists to make sure the user has a household. */
function HouseholdBootstrap() {
  useHouseholdBootstrap()
  return null
}
