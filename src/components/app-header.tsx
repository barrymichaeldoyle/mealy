import { Link } from '@tanstack/react-router'
import { UserButton } from '@clerk/tanstack-react-start'
import { Users } from 'lucide-react'

export function AppHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/90 backdrop-blur pt-safe">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        {title ? (
          <h1 className="truncate text-lg font-bold text-stone-800">{title}</h1>
        ) : (
          <Link to="/recipes" className="text-lg font-bold text-emerald-700">
            Mealy
          </Link>
        )}
        <div className="flex items-center gap-1">
          <Link
            to="/household"
            aria-label="Household"
            className="flex size-9 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-700"
          >
            <Users className="size-5" aria-hidden="true" />
          </Link>
          <UserButton />
        </div>
      </div>
    </header>
  )
}
