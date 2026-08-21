import { Check } from 'lucide-react'
import type { SaveStatus } from '../../hooks/use-save-state'

/**
 * What happened to the last save, next to the button that did it.
 *
 * A failure is a `role="alert"`, because the user has moved on believing it
 * worked. A success is `role="status"`, which waits its turn: they are
 * looking at the thing that just saved.
 */
export function SaveNotice({
  status,
  error,
}: {
  status: SaveStatus
  error?: string | undefined
}) {
  if (status === 'error') {
    return (
      <p role="alert" className="mt-2 text-meta font-medium text-danger-text">
        {error}
      </p>
    )
  }
  if (status === 'saved') {
    return (
      <output className="mt-2 flex items-center gap-1 text-meta font-medium text-basil-700">
        <Check className="size-3.5" aria-hidden="true" />
        Saved
      </output>
    )
  }
  // 'idle' and 'saving' say nothing: the button label carries "Saving…".
  return null
}
