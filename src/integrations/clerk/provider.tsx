import { ClerkProvider } from '@clerk/tanstack-react-start'
import { SetupNotice } from '../../components/setup-notice'

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
      /*
       * Clerk renders its own markup, so the theme has to be handed to it as
       * literal values. These mirror the tokens in src/styles.css: change one,
       * change the other. See docs/DESIGN_Specification.md §2.
       */
      appearance={{
        variables: {
          colorPrimary: '#2d5a3d', // basil-700
          colorBackground: '#faf7f0', // paper-50
          colorDanger: '#a83722', // tomato-700
          colorSuccess: '#2d5a3d', // basil-700
          fontFamily: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
          borderRadius: '10px', // --radius-card
        },
        elements: {
          // The form sits straight on the paper. A white card floating on a
          // cream page is the one thing this design is trying not to be.
          cardBox: { boxShadow: 'none', border: 'none' },
          card: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            border: 'none',
          },
          footer: { background: 'transparent' },
          headerTitle: {
            fontFamily: "'Fraunces Variable', Georgia, serif",
            fontWeight: 600,
            color: '#262115', // ink-900
          },
          formFieldInput: { backgroundColor: '#faf7f0' },
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
