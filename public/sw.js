/*
 * Mealy's service worker, hand written so it stays short enough to read.
 * Hashed build assets are served from the cache, the icons and the offline
 * page are picked up on install, and everything else goes to the network.
 *
 * HTML is never cached. Pages are server rendered with the signed-in user's
 * Clerk state inside them, and a cached copy would outlive the session on a
 * shared phone. The offline page is fetched without credentials for the same
 * reason: what lands in the cache is the signed-out shell.
 *
 * Bump CACHE when this file changes. Activating deletes every other cache.
 */
const CACHE = 'mealy-v1'

const OFFLINE_PAGE = '/offline'

const PRECACHE = [
  OFFLINE_PAGE,
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
]

const DAY = 24 * 60 * 60 * 1000

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(dropOldCaches().then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') {
    return
  }

  // Convex and Clerk live on other origins, and their traffic is live data.
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkThenOfflinePage(event, request))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
  }
})

/**
 * A failed precache must not fail the install, or a flaky connection leaves
 * the app with no worker at all. Whatever downloaded is still worth keeping.
 */
async function precache() {
  const cache = await caches.open(CACHE)
  await Promise.all(
    PRECACHE.map(async (path) => {
      try {
        const response = await fetch(path, {
          credentials: 'omit',
          cache: 'reload',
        })
        if (response.ok) {
          await cache.put(path, response)
        }
      } catch {
        // Offline during install. The next activation picks it up.
      }
    }),
  )
}

async function dropOldCaches() {
  const names = await caches.keys()
  await Promise.all(
    names.filter((name) => name !== CACHE).map((name) => caches.delete(name)),
  )
}

/** Hashed by the build, so a URL never changes what it points at. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(request)
  if (hit) {
    return hit
  }

  const response = await fetch(request)
  if (response.ok) {
    await cache.put(request, response.clone())
  }
  return response
}

async function networkThenOfflinePage(event, request) {
  try {
    const response = await fetch(request)
    event.waitUntil(refreshOfflinePage())
    return response
  } catch {
    const cache = await caches.open(CACHE)
    const offline = await cache.match(OFFLINE_PAGE)
    return offline ?? Response.error()
  }
}

/**
 * The precached offline page points at the hashed CSS and JS of the deploy
 * that installed this worker, and those files are gone a deploy or two later.
 * Refresh it once a day, riding on a navigation that has just proved the
 * network is up, so a long-lived install does not fall back to a bare page.
 */
async function refreshOfflinePage() {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(OFFLINE_PAGE)
  const fetchedAt = Date.parse(cached?.headers.get('date') ?? '')
  if (Date.now() - fetchedAt < DAY) {
    return
  }

  const response = await fetch(OFFLINE_PAGE, {
    credentials: 'omit',
    cache: 'reload',
  })
  if (response.ok) {
    await cache.put(OFFLINE_PAGE, response)
  }
}
