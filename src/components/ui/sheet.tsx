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
 * <dialog> so focus trapping and Escape come from the platform.
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
        'w-full max-w-lg rounded-t-3xl bg-white p-0 backdrop:bg-stone-900/40',
        'sm:rounded-3xl',
        'mx-auto mt-auto mb-0 sm:my-auto',
        'open:animate-none',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <h2 className="text-base font-semibold text-stone-800">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 rounded-full p-2 text-stone-500 hover:bg-stone-100"
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
