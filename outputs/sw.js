const CACHE = "rep-companion-v35";
const CORE_ASSETS = ["./", "./index.html", "./styles.css?v=35", "./health-data.js?v=35", "./i18n.js", "./app.js?v=35", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const ATLAS_ASSETS = ["./assets/gym-anatomy-atlas.png", "./assets/mobility-anatomy-atlas.png", "./assets/core-anatomy-atlas.png", "./assets/cardio-anatomy-atlas.png", "./assets/gym-anatomy-front-atlas.png", "./assets/mobility-anatomy-front-atlas.png", "./assets/core-anatomy-front-atlas.png", "./assets/cardio-anatomy-front-atlas.png", "./assets/priority-motion-atlas.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
  // Fetched after activation so the app becomes usable immediately instead of
  // blocking on ~13MB of exercise-demonstration images before install completes.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ATLAS_ASSETS)).catch(() => {}));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match("./index.html"))));
});
