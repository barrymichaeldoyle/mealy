import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * A round tick-off checkbox. Round because on a shopping list that shape
 * reads as "tap me", where a square reads as a form field.
 *
 * The native input stays in the tree and only loses its painted box, so
 * focus, keyboard and screen readers all behave. The tick scales in over
 * 150ms on top of it.
 */
export function Checkbox({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center')}>
      <input
        type="checkbox"
        className={cn(
          'peer size-6 appearance-none rounded-full border-2 border-paper-300',
          'bg-paper-50 transition-colors duration-150 ease-out',
          'checked:border-basil-700 checked:bg-basil-700',
          'focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-basil-700',
          className,
        )}
        {...props}
      />
      <Check
        aria-hidden="true"
        strokeWidth={3}
        className={cn(
          'pointer-events-none absolute size-3.5 scale-0 text-paper-50',
          'transition-transform duration-150 ease-out peer-checked:scale-100',
        )}
      />
    </span>
  )
}
