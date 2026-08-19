/*
 * Backdrop clicks land on the <dialog> element itself, which is the only way
 * to catch them. Keyboard users close with Escape (native to <dialog>) or the
 * close button, so the click handler is an extra affordance, never the only
 * way out, hence the two a11y rules below are not applicable here.
 */
/* oxlint-disable jsx-a11y/click-events-have-key-events */
/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions */
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Bottom sheet on phones, centred dialog on wider screens. Uses a native
 * <dialog> so focus trapping and Escape come from the platform. Sheets are
 * the one place a real shadow is allowed, because this surface floats.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) {
      return
    }
    if (open && !dialog.open) {
      dialog.showModal()
    }
    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // Clicks land on the dialog itself only when they hit the backdrop.
        if (event.target === ref.current) {
          onClose()
        }
      }}
      aria-label={title}
      className={cn(
        'w-full max-w-lg bg-paper-100 p-0 backdrop:bg-ink-900/30',
        'rounded-t-[1.25rem] sm:rounded-[1.25rem]',
        'mx-auto mt-auto mb-0 sm:my-auto',
        'shadow-[0_-4px_24px_rgba(38,33,21,0.16)]',
        'open:animate-[sheet-up_250ms_ease-out] sm:open:animate-none',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-paper-200 px-5 py-4">
        <h2 className="font-serif text-title font-medium text-ink-900">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 rounded-full p-2 text-ink-400 hover:bg-paper-200 hover:text-ink-600"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4 pb-safe">
        {children}
      </div>
    </dialog>
  )
}
