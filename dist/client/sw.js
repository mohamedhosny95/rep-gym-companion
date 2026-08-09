const CACHE = "rep-companion-v36";
const CORE_ASSETS = ["./", "./index.html", "./styles.css?v=36", "./health-data.js?v=36", "./i18n.js", "./app.js?v=36", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const ATLAS_ASSETS = ["./assets/gym-anatomy-atlas.webp", "./assets/mobility-anatomy-atlas.webp", "./assets/core-anatomy-atlas.webp", "./assets/cardio-anatomy-atlas.webp", "./assets/gym-anatomy-front-atlas.webp", "./assets/mobility-anatomy-front-atlas.webp", "./assets/core-anatomy-front-atlas.webp", "./assets/cardio-anatomy-front-atlas.webp", "./assets/priority-motion-atlas.webp"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
  // Fetched after activation so the app becomes usable immediately instead of
  // blocking on the exercise-demonstration images before install completes.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ATLAS_ASSETS)).catch(() => {}));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match("./index.html"))));
});
