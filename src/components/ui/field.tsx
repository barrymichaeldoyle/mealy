import { cloneElement, isValidElement, useId } from 'react'
import { cn } from '../../lib/cn'

/*
 * Inputs fill with `paper-50`, lighter than the `paper-100` card they sit
 * in, so they punch through the paper instead of sinking into it. 16px text
 * because anything smaller makes iOS zoom the page on focus.
 */
const CONTROL = cn(
  'w-full rounded-card border border-line bg-paper-50 px-3 py-2.5',
  'text-body text-ink-900 placeholder:text-ink-400',
  'transition-colors duration-150 ease-out',
  'focus:border-basil-700 focus:outline-2 focus:outline-offset-2',
  'focus:outline-basil-700',
)

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string
  hint?: string | undefined
  error?: string | undefined
  children: (id: string) => React.ReactNode
  className?: string | undefined
}) {
  const id = useId()
  const errorId = `${id}-error`
  const control = children(id)
  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Always a visible label. Placeholder-as-label loses the question. */}
      <label htmlFor={id} className="block text-meta font-medium text-ink-600">
        {label}
      </label>
      {/*
       * The control comes back from a render prop, so the invalid state is
       * stitched on here. Assistive tech needs both halves: the flag on the
       * control and a pointer to the message that explains it.
       */}
      {error && isValidElement<Record<string, unknown>>(control)
        ? cloneElement(control, {
            'aria-invalid': true,
            'aria-describedby': errorId,
          })
        : control}
      {hint && !error && <p className="text-meta text-ink-400">{hint}</p>}
      {error && (
        <p
          id={errorId}
          className="text-meta font-medium text-danger-text"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...props} />
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, 'resize-y', className)} {...props} />
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CONTROL, 'pr-8', className)} {...props} />
}
