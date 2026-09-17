// Stracs offline (Spezifikation §9: PWA, offline): erst das Netz fragen, ohne Netz die gespeicherte Kopie nehmen.
// Gespeichert werden nur Dateien dieser Seite – Tür, verschlüsselte App, Schriften, Symbole. Nichts davon ist lesbar ohne Codewort.
const CACHE = 'stracs-offline-v1'
/** Nach so vielen Millisekunden ohne Antwort (schlechtes Netz) lieber die gespeicherte Kopie zeigen */
const SLOW_MS = 4000

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

const keyOf = (request) => {
  const url = new URL(request.url)
  // Die Tür gibt es unter „/“ und „/index.html“ – eine gemeinsame Kopie
  return url.pathname === '/index.html' ? '/' : url.pathname
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  // Fremde Adressen (Briefkasten, Kalender …) und die Update-Prüfung nie aus dem Speicher
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/version.json' || url.pathname === '/sw.js') return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const network = fetch(request).then((response) => {
        if (response.ok) cache.put(keyOf(request), response.clone())
        return response
      })
      const saved = await cache.match(keyOf(request))
      if (!saved) return network
      // Netz zuerst – aber bei Funkloch oder sehr langsamem Netz die Kopie
      const slow = new Promise((resolve) => setTimeout(() => resolve(saved), SLOW_MS))
      return Promise.race([network.then((response) => (response.ok ? response : saved)).catch(() => saved), slow])
    })(),
  )
})
