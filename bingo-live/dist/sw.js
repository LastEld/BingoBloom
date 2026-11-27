const cacheName = "bingo-bloom-shell-e6acc3cda34b030c98c2";
const resources = ["./app.js","./assets/covers/autumn-window.jpg","./assets/covers/glasshouse.jpg","./assets/covers/hero.png","./assets/covers/meadow.jpg","./assets/icons/bloom-mark.svg","./assets/icons/icon-book.png","./assets/icons/icon-cup.png","./assets/icons/icon-heart.png","./assets/icons/icon-leaf.png","./assets/icons/icon-letter.png","./assets/icons/icon-moon.png","./assets/icons/icon-music.png","./assets/icons/icon-pen.png","./assets/icons/icon-sun.png","./assets/icons/install-192.png","./assets/icons/install-512.png","./assets/plants/catalog.json","./assets/plants/clover/clover-buds-1.png","./assets/plants/clover/clover-buds-2.png","./assets/plants/clover/clover-buds-3.png","./assets/plants/clover/clover-buds-4.png","./assets/plants/clover/clover-buds-5.png","./assets/plants/clover/clover-buds-6.png","./assets/plants/clover/clover-buds-7.png","./assets/plants/clover/clover-heads-1.png","./assets/plants/clover/clover-heads-2.png","./assets/plants/clover/clover-heads-3.png","./assets/plants/clover/clover-heads-4.png","./assets/plants/clover/clover-leaves-1.png","./assets/plants/clover/clover-leaves-10.png","./assets/plants/clover/clover-leaves-11.png","./assets/plants/clover/clover-leaves-12.png","./assets/plants/clover/clover-leaves-13.png","./assets/plants/clover/clover-leaves-2.png","./assets/plants/clover/clover-leaves-3.png","./assets/plants/clover/clover-leaves-4.png","./assets/plants/clover/clover-leaves-5.png","./assets/plants/clover/clover-leaves-6.png","./assets/plants/clover/clover-leaves-7.png","./assets/plants/clover/clover-leaves-8.png","./assets/plants/clover/clover-leaves-9.png","./assets/plants/clover/clover-petals-1.png","./assets/plants/clover/clover-petals-10.png","./assets/plants/clover/clover-petals-11.png","./assets/plants/clover/clover-petals-2.png","./assets/plants/clover/clover-petals-3.png","./assets/plants/clover/clover-petals-4.png","./assets/plants/clover/clover-petals-5.png","./assets/plants/clover/clover-petals-6.png","./assets/plants/clover/clover-petals-7.png","./assets/plants/clover/clover-petals-8.png","./assets/plants/clover/clover-petals-9.png","./assets/plants/clover/clover-stems-1.png","./assets/plants/clover/clover-stems-2.png","./assets/plants/clover/clover-stems-3.png","./assets/plants/cornflower/cornflower-buds-1.png","./assets/plants/cornflower/cornflower-buds-2.png","./assets/plants/cornflower/cornflower-heads-1.png","./assets/plants/cornflower/cornflower-heads-2.png","./assets/plants/cornflower/cornflower-heads-3.png","./assets/plants/cornflower/cornflower-leaves-1.png","./assets/plants/cornflower/cornflower-leaves-2.png","./assets/plants/cornflower/cornflower-leaves-3.png","./assets/plants/cornflower/cornflower-leaves-4.png","./assets/plants/cornflower/cornflower-petals-1.png","./assets/plants/cornflower/cornflower-petals-2.png","./assets/plants/cornflower/cornflower-petals-3.png","./assets/plants/cornflower/cornflower-petals-4.png","./assets/plants/cornflower/cornflower-petals-5.png","./assets/plants/cornflower/cornflower-stems-1.png","./assets/plants/cornflower/cornflower-stems-2.png","./assets/plants/daisy/daisy-buds-1.png","./assets/plants/daisy/daisy-buds-2.png","./assets/plants/daisy/daisy-buds-3.png","./assets/plants/daisy/daisy-heads-1.png","./assets/plants/daisy/daisy-heads-2.png","./assets/plants/daisy/daisy-heads-3.png","./assets/plants/daisy/daisy-leaves-1.png","./assets/plants/daisy/daisy-leaves-2.png","./assets/plants/daisy/daisy-leaves-3.png","./assets/plants/daisy/daisy-leaves-4.png","./assets/plants/daisy/daisy-petals-1.png","./assets/plants/daisy/daisy-petals-2.png","./assets/plants/daisy/daisy-petals-3.png","./assets/plants/daisy/daisy-petals-4.png","./assets/plants/daisy/daisy-stems-1.png","./assets/plants/daisy/daisy-stems-2.png","./assets/plants/poppy/poppy-buds-1.png","./assets/plants/poppy/poppy-buds-2.png","./assets/plants/poppy/poppy-heads-1.png","./assets/plants/poppy/poppy-heads-2.png","./assets/plants/poppy/poppy-heads-3.png","./assets/plants/poppy/poppy-leaves-1.png","./assets/plants/poppy/poppy-leaves-2.png","./assets/plants/poppy/poppy-leaves-3.png","./assets/plants/poppy/poppy-petals-1.png","./assets/plants/poppy/poppy-petals-2.png","./assets/plants/poppy/poppy-petals-3.png","./assets/plants/poppy/poppy-petals-4.png","./assets/plants/poppy/poppy-petals-5.png","./assets/plants/poppy/poppy-stems-1.png","./assets/plants/poppy/poppy-stems-2.png","./assets/textures/paper.svg","./export/board-png.js","./game/board.js","./game/calendar.js","./game/progress.js","./game/storage.js","./index.html","./manifest.webmanifest","./plants/growth-v3.js","./plants/growth.js","./plants/paper.js","./plants/parts.js","./plants/pigment.js","./plants/specimen.js","./styles/board.css","./styles/harvest-flight.css","./styles/herbarium.css","./styles/themes.css","./styles/tokens.js","./ui/board-creation.js","./ui/board-view.js","./ui/effects.js","./ui/first-run.js","./ui/focus-card.js","./ui/group-selection.js","./ui/harvest-flight.js","./ui/harvest.js","./ui/herbarium-view.js","./ui/icons.js","./ui/offline.js","./ui/press-preview.js"];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    try {
      await cache.addAll(resources.map(url => new Request(url, {cache: 'reload'})));
    } catch (error) {
      await caches.delete(cacheName);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('bingo-bloom-shell-') && name !== cacheName) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const key = request.mode === 'navigate' ? new URL('./index.html', self.registration.scope).href : request;
    return await cache.match(key) || fetch(request);
  })());
});
