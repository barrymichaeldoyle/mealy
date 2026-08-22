import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/tanstack-react-start'
import { clearCachedLists } from '../lib/offline-lists'

/**
 * The cached shopping list outlives the session it came from, because that
 * is the point: it has to survive the tab dying in a shop with no signal.
 * It must not outlive the person, though. Signing out takes it with them,
 * which matters on the shared family phone this app is built for.
 *
 * Renders nothing, and sits above the signed-in layout so it is still
 * mounted at the moment the session goes.
 */
export function ListCacheGuard() {
  const { isLoaded, userId } = useAuth()
  const wasSignedIn = useRef(false)

  useEffect(() => {
    if (!isLoaded) {
      return
    }
    if (userId) {
      wasSignedIn.current = true
      return
    }
    if (wasSignedIn.current) {
      wasSignedIn.current = false
      clearCachedLists(window.localStorage)
    }
  }, [isLoaded, userId])

  return null
}
