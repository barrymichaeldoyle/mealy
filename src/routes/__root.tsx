import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import { ServiceWorker } from '../components/service-worker'
import { ListCacheGuard } from '../components/list-cache'
import { AppClerkProvider } from '../integrations/clerk/provider'
import { AppConvexProvider } from '../integrations/convex/provider'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      // Paper, not basil: the browser chrome should blend with the app
      // background rather than shout. See docs/LOGO_Specification.md.
      { name: 'theme-color', content: '#faf7f0' },
      { title: 'Mealy' },
      {
        name: 'description',
        content:
          'Save your recipes, plan the week’s dinners, and shop from one ' +
          'consolidated list.',
      },
      // iOS only reads the manifest for a Home Screen app from 17.4, so the
      // older Apple keys stay until that floor is not worth caring about.
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Mealy' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
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
        <AppClerkProvider>
          <ListCacheGuard />
          <AppConvexProvider>{children}</AppConvexProvider>
        </AppClerkProvider>
        <ServiceWorker />
        <Scripts />
      </body>
    </html>
  )
}
