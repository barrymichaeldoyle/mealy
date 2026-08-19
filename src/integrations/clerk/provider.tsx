import { ClerkProvider } from '@clerk/tanstack-react-start'
import { SetupNotice } from '../../components/setup-notice'
import { clerkAppearance } from './appearance'

const PUBLISHABLE_KEY = import.meta.env['VITE_CLERK_PUBLISHABLE_KEY'] as
  | string
  | undefined

export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  // In development Clerk falls back to keyless mode, which is a genuinely
  // useful way to try the app before creating an account. A production build
  // with no key would fail silently, so that case gets a clear notice.
  if (!PUBLISHABLE_KEY && import.meta.env.PROD) {
    return (
      <SetupNotice
        missing="VITE_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY"
        command="https://dashboard.clerk.com → API keys"
        detail="Copy both keys into .env.local, then restart the dev server."
      />
    )
  }

  return (
    <ClerkProvider
      // Spread rather than pass undefined: keyless mode wants the prop absent.
      {...(PUBLISHABLE_KEY ? { publishableKey: PUBLISHABLE_KEY } : {})}
      appearance={clerkAppearance}
    >
      {children}
    </ClerkProvider>
  )
}
