import { cn } from '../../lib/cn'

/**
 * Depth comes from a tone shift plus a hairline, never a shadow. Shadows are
 * reserved for things that actually float: the sheet and the sticky bars.
 */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-paper-200 bg-paper-100',
        className,
      )}
      {...props}
    />
  )
}
