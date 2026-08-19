import { cn } from '../../lib/cn'

/**
 * A row inside a card list. At least 52px tall, comfortably over the 44px
 * touch target.
 */
export function ListRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex min-h-[52px] items-center gap-3 px-4 py-2',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Wraps a set of `ListRow`s. `divide-inset` draws the hairline from the text
 * edge rather than the card edge, which is the small detail that stops a
 * list looking like a table.
 */
export function ListRows({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('divide-inset', className)} {...props} />
}
