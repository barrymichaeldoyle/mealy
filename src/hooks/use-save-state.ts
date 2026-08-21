import { useState } from 'react'
import { ConvexError } from 'convex/values'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * The state a save button needs to stop lying.
 *
 * A bare `void mutate(...)` looks identical whether it wrote, is still
 * writing, or failed on a dropped connection, and the household screen had
 * two of those. This carries the three outcomes so the screen can say which
 * one happened.
 */
export function useSaveState(): {
  status: SaveStatus
  error: string | undefined
  save: (run: () => Promise<unknown>) => Promise<void>
  reset: () => void
} {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | undefined>(undefined)

  return {
    status,
    error,
    reset: () => {
      setStatus('idle')
      setError(undefined)
    },
    save: async (run) => {
      setStatus('saving')
      setError(undefined)
      try {
        await run()
        setStatus('saved')
      } catch (thrown) {
        setStatus('error')
        // ConvexError carries the message we wrote; anything else is a
        // network or runtime failure the user cannot act on specifically.
        setError(
          thrown instanceof ConvexError
            ? String(thrown.data)
            : 'That did not save. Check your connection and try again.',
        )
      }
    },
  }
}
