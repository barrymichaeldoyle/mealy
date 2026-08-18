import { cn } from '../../lib/cn'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

// Every target clears 44px so it stays thumb-friendly on a phone.
const SIZES: Record<Size, string> = {
  sm: 'min-h-[36px] px-3 text-sm gap-1.5',
  md: 'min-h-[44px] px-4 text-sm gap-2',
  lg: 'min-h-[52px] px-5 text-base gap-2',
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800',
  accent:
    'bg-orange-500 text-white shadow-sm hover:bg-orange-600 active:bg-orange-700',
  secondary:
    'bg-white text-stone-700 border border-stone-200 shadow-sm hover:bg-stone-50',
  ghost: 'text-stone-600 hover:bg-stone-100',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
}

export function buttonClass(
  variant: Variant = 'primary',
  size: Size = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center rounded-2xl font-semibold',
    'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
    'focus-visible:outline-emerald-600 disabled:opacity-50',
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
