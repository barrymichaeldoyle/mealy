import { useEffect, useState } from 'react'

/**
 * Whether the browser thinks it has a connection. Used to decide what a
 * screen offers rather than what it shows: reading works from the cache
 * either way, and it is writing that has to wait.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const setOnlineState = () => setOnline(true)
    const setOfflineState = () => setOnline(false)
    window.addEventListener('online', setOnlineState)
    window.addEventListener('offline', setOfflineState)
    return () => {
      window.removeEventListener('online', setOnlineState)
      window.removeEventListener('offline', setOfflineState)
    }
  }, [])

  return online
}
