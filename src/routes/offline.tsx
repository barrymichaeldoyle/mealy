import { createFileRoute } from '@tanstack/react-router'
import { CloudOff } from 'lucide-react'
import { buttonClass } from '../components/ui/button'
import { Logo } from '../components/ui/logo'

export const Route = createFileRoute('/offline')({
  component: Offline,
  head: () => ({
    meta: [
      { title: 'Offline · Mealy' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
})

/**
 * The service worker serves this page, from the cache, when a navigation
 * fails. It has to stand on its own: no Convex data, no Clerk session, and
 * it must still read correctly if the hashed CSS behind it has gone.
 *
 * The links are plain anchors, not router links, so tapping one asks the
 * network again instead of routing inside a shell that never loaded.
 */
function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 py-12 text-center pt-safe">
      <Logo className="size-12" />
      <CloudOff
        className="mt-8 size-8 text-ink-400"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <h1 className="mt-4 font-serif text-display font-semibold text-ink-900">
        You’re offline
      </h1>
      <p className="mt-3 text-body text-ink-600">
        Mealy needs a connection to load your recipes, your plan and your lists.
        Nothing you have already saved is lost.
      </p>
      <a href="/plan" className={buttonClass('primary', 'md', 'mt-8')}>
        Try again
      </a>
    </main>
  )
}
