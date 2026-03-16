const STATIC_CACHE = 'lumix-driver-static-v1'
const PAGE_CACHE = 'lumix-driver-pages-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([
        '/manifest.webmanifest',
        '/logo.svg',
      ]),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  const isDriverRoute = request.mode === 'navigate' && url.pathname.includes('/driver')
  const isStaticAsset = ['script', 'style', 'image', 'font'].includes(request.destination)

  if (isDriverRoute) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/fi/driver'))),
    )
    return
  }

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
            return response
          })
          .catch(() => cached)

        return cached || networkFetch
      }),
    )
  }
})
