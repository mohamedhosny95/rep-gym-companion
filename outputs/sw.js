const CACHE = "rep-companion-v20";
const ASSETS = ["./", "./index.html", "./styles.css?v=20", "./health-data.js?v=20", "./i18n.js", "./app.js?v=20", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./assets/gym-anatomy-atlas.png", "./assets/mobility-anatomy-atlas.png", "./assets/core-anatomy-atlas.png", "./assets/cardio-anatomy-atlas.png", "./assets/gym-anatomy-front-atlas.png", "./assets/mobility-anatomy-front-atlas.png", "./assets/core-anatomy-front-atlas.png", "./assets/cardio-anatomy-front-atlas.png", "./assets/priority-motion-atlas.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match("./index.html"))));
});
