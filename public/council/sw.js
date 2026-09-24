// The smallest service worker that does something honest.
//
// It exists so the Council can be installed to a home screen, which needs one.
// It caches nothing on purpose: a stale copy of a conversation is worse than no
// copy, and the room is the only place the truth lives. Only page loads pass
// through here, so reading and posting are never touched.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
  }
});
