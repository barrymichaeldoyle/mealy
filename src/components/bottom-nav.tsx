import { Link } from '@tanstack/react-router'
import { CalendarDays, ChefHat, ShoppingBasket } from 'lucide-react'
import { cn } from '../lib/cn'

const TABS = [
  { to: '/recipes', label: 'Recipes', icon: ChefHat },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/lists', label: 'Lists', icon: ShoppingBasket },
] as const

/**
 * Bottom tab bar on phones; a left sidebar from `md` up. One component so
 * the active state logic does not get duplicated.
 */
export function AppNav() {
  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95',
        'backdrop-blur pb-safe',
        'md:inset-y-0 md:right-auto md:left-0 md:w-56 md:border-t-0',
        'md:border-r md:pt-20',
      )}
    >
      <ul className="mx-auto flex max-w-lg md:flex-col md:gap-1 md:px-3">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="block"
              activeProps={{ 'data-active': 'true' }}
            >
              {({ isActive }) => (
                <span
                  className={cn(
                    'flex min-h-[56px] flex-col items-center justify-center gap-1',
                    'text-xs font-medium transition-colors',
                    'md:min-h-[44px] md:flex-row md:justify-start md:gap-3',
                    'md:rounded-xl md:px-3 md:text-sm',
                    isActive
                      ? 'text-emerald-700 md:bg-emerald-50'
                      : 'text-stone-500 hover:text-stone-700',
                  )}
                >
                  <Icon
                    className={cn('size-6 md:size-5')}
                    strokeWidth={isActive ? 2.4 : 1.8}
                    aria-hidden="true"
                  />
                  {label}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
