import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CloudOff } from 'lucide-react'
import { buttonClass } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'
import { ListRows } from '../components/ui/list-row'
import { Logo } from '../components/ui/logo'
import {
  queueToggle,
  readLastCachedList,
  toggleCachedItem,
  type CachedShoppingList,
} from '../lib/offline-lists'
import { formatListItem } from '../lib/units'
import { cn } from '../lib/cn'
import type { Id } from '../../convex/_generated/dataModel'

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
 *
 * It also carries the shopping list, which is the whole reason the offline
 * caching exists. HTML is deliberately never cached, so a phone that locks
 * in a shop and drops the tab used to come back to "you need a connection"
 * at exactly the moment the list was needed. localStorage survives that,
 * and reading it needs neither the network nor a session.
 */
function Offline() {
  const [cached, setCached] = useState<
    { userId: string; list: CachedShoppingList } | undefined
  >(undefined)

  // After mount only: the server has no localStorage, and rendering the
  // list into the HTML would put it in the cached copy of this page.
  useEffect(() => {
    setCached(readLastCachedList(window.localStorage))
  }, [])

  if (!cached) {
    return (
      <Shell>
        <p className="mt-3 text-body text-ink-600">
          Mealy needs a connection to load your recipes, your plan and your
          lists. Nothing you have already saved is lost.
        </p>
        <a href="/plan" className={buttonClass('primary', 'md', 'mt-8')}>
          Try again
        </a>
      </Shell>
    )
  }

  return <OfflineList entry={cached} onChange={setCached} />
}

function Shell({ children }: { children: React.ReactNode }) {
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
      {children}
    </main>
  )
}

/**
 * Read and tick, and nothing else. Adding, editing and deleting all need the
 * server, so they are not offered rather than offered and refused.
 */
function OfflineList({
  entry,
  onChange,
}: {
  entry: { userId: string; list: CachedShoppingList }
  onChange: (next: { userId: string; list: CachedShoppingList }) => void
}) {
  const { userId, list } = entry
  const pending = list.items.filter((item) => !item.checked)
  const done = list.items.length - pending.length

  const toggle = (id: Id<'shoppingListItems'>, checked: boolean) => {
    toggleCachedItem(window.localStorage, userId, id, checked)
    // Replayed by the app the next time it loads with a connection.
    queueToggle(window.localStorage, userId, { id, checked })
    onChange({
      userId,
      list: {
        ...list,
        items: list.items.map((item) =>
          item._id === id ? { ...item, checked } : item,
        ),
      },
    })
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 pt-safe">
      <div className="flex items-center gap-2">
        <Logo className="size-7" />
        <CloudOff
          className="ml-auto size-4 text-ink-400"
          strokeWidth={2}
          aria-hidden="true"
        />
        <p className="text-meta font-medium text-ink-400">Offline</p>
      </div>

      <h1 className="mt-6 font-serif text-display font-semibold text-ink-900">
        {list.name}
      </h1>
      <p className="mt-1 text-meta font-medium text-ink-400">
        {done} of {list.items.length} ticked · saved copy
      </p>

      <Card className="mt-4 overflow-hidden">
        <ListRows>
          {list.items.map((item) => (
            <label
              key={item._id}
              className="flex min-h-[52px] cursor-pointer items-center gap-3 px-4 py-2"
            >
              <Checkbox
                checked={item.checked}
                onChange={(event) => toggle(item._id, event.target.checked)}
              />
              <span
                className={cn(
                  'min-w-0 grow text-body',
                  item.checked ? 'text-ink-400 line-through' : 'text-ink-900',
                )}
              >
                {item.name}
              </span>
              <span
                className={cn(
                  'shrink-0 text-body font-semibold tabular-nums',
                  item.checked ? 'text-ink-400 line-through' : 'text-ink-600',
                )}
              >
                {formatListItem(item)}
              </span>
            </label>
          ))}
        </ListRows>
      </Card>

      <p className="mt-4 text-meta text-ink-400">
        What you tick here is saved to this phone and sent on as soon as you
        have signal. Adding and editing need a connection.
      </p>
      <a
        href="/lists"
        className={buttonClass('secondary', 'md', 'mt-4 w-full')}
      >
        Try again
      </a>
    </main>
  )
}
