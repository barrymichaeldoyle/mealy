import { useAuth } from '@clerk/tanstack-react-start'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { SetupNotice } from '../../components/setup-notice'

const CONVEX_URL = import.meta.env['VITE_CONVEX_URL'] as string | undefined

// Created once at module scope; `null` means the app is not configured yet.
const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null

/**
 * Convex authenticates every request with the signed-in user's Clerk token,
 * which is what makes `ctx.auth.getUserIdentity()` work on the server.
 */
export function AppConvexProvider({ children }: { children: React.ReactNode }) {
  if (!convex) {
    return (
      <SetupNotice
        missing="VITE_CONVEX_URL"
        command="npx convex dev"
        detail="Run it once to create a deployment and write the URL into .env.local."
      />
    )
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
