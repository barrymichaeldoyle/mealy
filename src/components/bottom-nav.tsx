import { Link } from '@tanstack/react-router'
import { Book, CalendarDays, ShoppingBasket } from 'lucide-react'
import { cn } from '../lib/cn'

const TABS = [
  { to: '/recipes', label: 'Recipes', icon: Book },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/lists', label: 'Lists', icon: ShoppingBasket },
] as const

/**
 * Bottom tab bar on phones; a left sidebar from `md` up. One component so
 * the active state logic does not get duplicated.
 *
 * Active is basil, inactive is `ink-400`. No filled-versus-outlined icon
 * swap: the colour and the weight already say which tab you are on.
 */
export function AppNav() {
  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 bg-paper-50 pb-safe',
        'shadow-[0_-1px_0_var(--color-paper-200)]',
        'md:inset-y-0 md:right-auto md:left-0 md:w-56 md:pt-20',
        'md:shadow-[1px_0_0_var(--color-paper-200)]',
      )}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-3 md:flex md:flex-col md:gap-1 md:px-3">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="min-w-0 md:w-full">
            <Link to={to} className="block w-full">
              {({ isActive }) => (
                <span
                  className={cn(
                    'flex h-14 w-full flex-col items-center justify-center gap-1',
                    'text-meta transition-colors duration-150 ease-out',
                    'md:h-11 md:flex-row md:justify-start md:gap-3',
                    'md:rounded-btn md:px-3',
                    isActive
                      ? 'font-medium text-basil-700 md:bg-basil-100'
                      : 'text-ink-400 hover:text-ink-600',
                  )}
                >
                  <Icon
                    className="size-6 shrink-0 md:size-5"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="leading-none md:leading-[inherit]">
                    {label}
                  </span>
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
