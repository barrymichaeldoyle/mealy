import { Link } from '@tanstack/react-router'
import { UserButton } from '@clerk/tanstack-react-start'
import { Users } from 'lucide-react'
import { Logo } from './ui/logo'

/**
 * The bar every screen sits under. A hairline, not a border plus a shadow,
 * so it reads as the top edge of the paper rather than a floating chrome.
 */
export function AppHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-20 bg-paper-50/90 shadow-[0_1px_0_var(--color-paper-200)] backdrop-blur pt-safe">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        {title ? (
          <h1 className="truncate font-serif text-title font-medium text-ink-900">
            {title}
          </h1>
        ) : (
          <Link
            to="/recipes"
            className="flex items-center gap-2 rounded-btn font-serif text-title font-semibold text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-basil-700"
          >
            <Logo className="size-6" />
            Mealy
          </Link>
        )}
        <UserButton
          appearance={{ elements: { avatarBox: 'size-9' } }}
          aria-label="Open account menu"
        >
          <UserButton.MenuItems>
            <UserButton.Link
              label="Household"
              labelIcon={<Users className="size-4" aria-hidden="true" />}
              href="/household"
            />
          </UserButton.MenuItems>
        </UserButton>
      </div>
    </header>
  )
}
