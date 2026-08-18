import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import ClerkProvider from '../integrations/clerk/provider'
import ConvexProvider from '../integrations/convex/provider'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { name: 'theme-color', content: '#059669' },
      { title: 'Mealy Plan' },
      {
        name: 'description',
        content:
          'Save your recipes, plan the week’s dinners, and shop from one ' +
          'consolidated list.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Clerk wraps Convex: the Convex client reads Clerk's auth token. */}
        <ClerkProvider>
          <ConvexProvider>{children}</ConvexProvider>
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
