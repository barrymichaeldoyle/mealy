import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/tanstack-react-start'
import { clearCachedLists } from '../lib/offline-lists'
import { clearCachedRecipes } from '../lib/offline-recipes'

/**
 * The cached list and recipe book outlive the session they came from,
 * because that is the point: they have to survive the tab dying in a shop
 * or a kitchen with no signal. They must not outlive the person, though.
 * Signing out takes both with them, which matters on the shared family
 * phone this app is built for.
 *
 * Renders nothing, and sits above the signed-in layout so it is still
 * mounted at the moment the session goes.
 */
export function OfflineCacheGuard() {
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
      clearCachedRecipes(window.localStorage)
    }
  }, [isLoaded, userId])

  return null
}
