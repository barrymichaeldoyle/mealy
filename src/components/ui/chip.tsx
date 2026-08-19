import { cn } from '../../lib/cn'

/**
 * A quiet bordered chip: recipe tags, filters, badges. Never a coloured
 * pill. Selection is carried by the basil tint plus the border, so it does
 * not rely on hue alone.
 */
export function chipClass(selected = false, className?: string): string {
  return cn(
    'inline-flex items-center rounded-full border px-3 py-1 text-meta',
    'font-medium transition-colors duration-150 ease-out',
    selected
      ? 'border-basil-700 bg-basil-100 text-basil-800'
      : 'border-paper-300 bg-paper-100 text-ink-600',
    className,
  )
}

export function Chip({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={chipClass(false, className)} {...props} />
}
