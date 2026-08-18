import { useEffect, useState } from 'react'
import { Button, type ButtonProps } from './button'

/**
 * Two-tap delete. Avoids window.confirm, which is easy to mis-tap on a
 * phone and blocks the whole page.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = 'Tap again to confirm',
  ...props
}: Omit<ButtonProps, 'onClick'> & {
  onConfirm: () => void
  confirmLabel?: string
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timer)
  }, [armed])

  return (
    <Button
      variant="danger"
      onClick={() => {
        if (armed) {
          onConfirm()
          setArmed(false)
        } else {
          setArmed(true)
        }
      }}
      {...props}
    >
      {armed ? confirmLabel : children}
    </Button>
  )
}
