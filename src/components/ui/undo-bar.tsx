import { X } from 'lucide-react'
import { Button } from './button'
import { cn } from '../../lib/cn'

/**
 * The way back from an action that would otherwise need a confirmation.
 *
 * A confirm on every meal you remove would be worse than the mistake it
 * prevents, since changing your mind about Thursday is the normal case. So
 * the action goes through and this offers the way back.
 *
 * It does not time out. An undo that disappears on its own is a time limit
 * (WCAG 2.2.1), and the moment you notice the wrong meal went is often after
 * you have scrolled. It stays until you take it, dismiss it, or replace it.
 */
export function UndoBar({
  message,
  onUndo,
  onDismiss,
}: {
  message: string
  onUndo: () => void
  onDismiss: () => void
}) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4',
        'pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))]',
        'md:pb-6 md:pl-64',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto mx-auto flex max-w-md items-center gap-3',
          'rounded-card border border-line bg-paper-100 py-2 pr-2 pl-4',
          'shadow-[0_4px_20px_rgba(38,33,21,0.16)]',
        )}
      >
        {/*
         * Only the message is the live region. Wrapping the buttons too
         * would re-announce "Undo" every time the text changes. `output`
         * is polite by default, which is right: the change already
         * happened and the user is looking at it.
         */}
        <output className="min-w-0 flex-1 truncate text-body text-ink-900">
          {message}
        </output>
        <Button variant="secondary" size="sm" onClick={onUndo}>
          Undo
        </Button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-btn',
            'text-ink-400 hover:bg-paper-200 hover:text-ink-600',
            'focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-basil-700',
          )}
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
