import { LOGO_COLOURS, MARK } from '../../lib/logo'
import { cn } from '../../lib/cn'

/**
 * The Mealy mark: a sprig of basil drawn as a checkmark. See
 * `docs/LOGO_Specification.md`.
 *
 * Decorative by design. Every lockup in the app pairs it with the wordmark
 * as real text, so announcing it again would just repeat "Mealy". Below
 * 24px use the favicon instead, which drops the tip leaf.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('size-8', className)}
    >
      <path
        d={MARK.stem}
        stroke={LOGO_COLOURS.basil}
        strokeWidth={MARK.stemWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {MARK.leaves.map((leaf) => (
        <path key={leaf} d={leaf} fill={LOGO_COLOURS.basil} />
      ))}
      {MARK.tipLeaf ? (
        <path d={MARK.tipLeaf} fill={LOGO_COLOURS.basilLight} />
      ) : null}
    </svg>
  )
}
