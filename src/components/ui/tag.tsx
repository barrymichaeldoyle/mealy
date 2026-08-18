import { cn } from '../../lib/cn'

export function Tag({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5',
        'text-xs font-medium text-amber-900',
        className,
      )}
      {...props}
    />
  )
}
