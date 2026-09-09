// The smallest service worker that does something honest.
//
// It exists so the atelier can be installed to a home screen, which needs one.
// It deliberately caches nothing: every part of this page needs the network,
// and a stale copy of a conversation would be worse than no copy. Only page
// loads pass through here, so the streaming reply is never touched.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
  }
});
