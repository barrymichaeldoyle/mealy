import { useState } from 'react'
import { Button, type ButtonProps } from './button'
import { Sheet } from './sheet'

/**
 * Destructive actions get a separate decision surface. The trigger stays
 * quick to reach, while the consequence and safe way out remain explicit.
 */
export function ConfirmButton({
  onConfirm,
  children,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  ...buttonProps
}: Omit<ButtonProps, 'onClick'> & {
  onConfirm: () => unknown | Promise<unknown>
  title?: string
  description: string
  confirmLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  return (
    <>
      <Button
        variant="danger"
        onClick={() => {
          setError(false)
          setOpen(true)
        }}
        {...buttonProps}
      >
        {children}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <p className="text-body text-ink-600">{description}</p>
        {error && (
          <p
            className="mt-3 text-body font-medium text-danger-text"
            role="alert"
          >
            That did not work. Nothing was changed. Try again.
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="dangerPrimary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError(false)
              try {
                await onConfirm()
                setOpen(false)
              } catch {
                setError(true)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
