import { cn } from '../../lib/cn'

/**
 * Paper on paper: `paper-100` shimmering to `paper-200`. A grey block on
 * white would flash against the warm background it is standing in for.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card bg-paper-100',
        'animate-[paper-shimmer_1.6s_ease-in-out_infinite]',
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  )
}

/** Matches the height of a real recipe or list card, so nothing jumps. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
  )
}
