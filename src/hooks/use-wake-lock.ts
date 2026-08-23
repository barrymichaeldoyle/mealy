import { useEffect } from 'react'

/**
 * Hold the screen on while a recipe is open.
 *
 * A recipe is read a step at a time over half an hour, with hands that are
 * covered in flour. The phone dimming between steps is the one thing this
 * screen cannot afford, and wiping a hand to wake it is the moment cooking
 * from a phone stops being nicer than cooking from a book.
 *
 * Progressive enhancement: the API needs a secure context and is missing on
 * some browsers, so every path is guarded and failure is silent. The lock is
 * dropped by the platform whenever the tab is hidden, which is what stops it
 * burning the battery of a phone left face-down, so it is taken again when
 * the tab comes back.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') {
      return
    }
    const wakeLock = navigator.wakeLock
    if (!wakeLock) {
      return
    }

    let sentinel: WakeLockSentinel | null = null
    let released = false

    const acquire = async () => {
      if (released || document.visibilityState !== 'visible') {
        return
      }
      try {
        sentinel = await wakeLock.request('screen')
      } catch {
        // Denied, unsupported, or the tab lost focus mid-request. Nothing
        // to tell the user: the screen simply behaves as it always did.
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void acquire()
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release().catch(() => undefined)
    }
  }, [active])
}
