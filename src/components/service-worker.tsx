import { useEffect } from 'react'

/**
 * Registers `public/sw.js` once the page has loaded, so it never competes
 * with the first render for bandwidth. Development runs without a worker: a
 * cached shell would hide the change you just made.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
      return
    }

    const register = () => {
      // `updateViaCache: 'none'` keeps a stale HTTP-cached worker from
      // deciding whether a new one exists.
      void navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none',
      })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register)
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
