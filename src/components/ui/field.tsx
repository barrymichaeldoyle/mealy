import { useId } from 'react'
import { cn } from '../../lib/cn'

const CONTROL = cn(
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5',
  'text-base text-stone-800 placeholder:text-stone-400 shadow-sm',
  'focus:border-emerald-500 focus:outline-2 focus:outline-offset-0',
  'focus:outline-emerald-500/40',
)

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string
  children: (id: string) => React.ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      {children(id)}
      {hint && !error && <p className="text-xs text-stone-500">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-red-600" role="alert">
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
