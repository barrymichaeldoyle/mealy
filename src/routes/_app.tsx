import { Outlet, createFileRoute } from '@tanstack/react-router'
import {
  ClerkLoaded,
  RedirectToSignIn,
  Show,
} from '@clerk/tanstack-react-start'
import { AppNav } from '../components/bottom-nav'

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
        <div className="md:pl-56">
          <Outlet />
        </div>
        <AppNav />
      </Show>
    </ClerkLoaded>
  )
}
