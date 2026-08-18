import { cn } from '../../lib/cn'

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/70',
        className,
      )}
      {...props}
    />
  )
}
