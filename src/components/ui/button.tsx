import { cn } from '../../lib/cn'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

// Every target clears 44px so it stays thumb-friendly on a phone.
const SIZES: Record<Size, string> = {
  sm: 'min-h-[36px] px-3 text-meta gap-1.5',
  md: 'min-h-[44px] px-4 text-body gap-2',
  lg: 'min-h-[52px] px-5 text-body gap-2',
}

/*
 * Three shapes, not five: a filled action, a bordered one, and plain text.
 * `accent` is the same shape as `primary` in tomato, and a screen gets at
 * most one of it. Pressed states darken the fill rather than move anything.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-basil-700 text-paper-50 hover:bg-basil-800 active:bg-basil-800',
  accent:
    'bg-tomato-600 text-paper-50 hover:bg-tomato-700 active:bg-tomato-700',
  secondary:
    'bg-paper-100 text-ink-900 border border-paper-300 hover:bg-paper-200',
  ghost: 'text-ink-600 hover:bg-paper-100',
  danger: 'text-danger-text hover:bg-paper-100',
}

export function buttonClass(
  variant: Variant = 'primary',
  size: Size = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center rounded-btn font-semibold',
    'transition-colors duration-150 ease-out',
    'focus-visible:outline-2 focus-visible:outline-offset-2',
    'focus-visible:outline-basil-700 disabled:opacity-50',
    'disabled:pointer-events-none',
    SIZES[size],
    VARIANTS[variant],
    className,
  )
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      {...props}
    />
  )
}
