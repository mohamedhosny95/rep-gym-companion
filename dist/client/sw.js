const BUILD_VERSION="90adfcd5663a";
const CACHE = `rep-companion-${BUILD_VERSION}`;
const versioned=path=>`${path}?v=${BUILD_VERSION}`;
const CORE_ASSETS = ["./", "./index.html", ...["./styles.css","./build-meta.js","./auth.js","./storage.js","./ui-state.js","./ui-shell.js","./health-data.js","./i18n.js","./features.js","./health-engine.js","./health-coverage.js","./performance-insights.js","./bootstrap.js","./app.js","./sync-outbox.js","./telemetry.js","./sync.js","./sync-center.js","./enhancements.js","./habits.js","./health-ui.js","./performance-ui.js"].map(versioned), "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
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
  // API responses are dynamic and must never be cached - e.g. /api/vitals/pending
  // would otherwise serve a stale "no new data" answer forever for a repeated
  // ?since= query, hiding newly imported data.
  if (new URL(event.request.url).pathname.startsWith("/api/")) { event.respondWith(fetch(event.request)); return; }
  if (event.request.mode === "navigate") { event.respondWith(fetch(event.request).then(response => { const copy=response.clone();caches.open(CACHE).then(cache=>cache.put("./index.html",copy));return response; }).catch(()=>caches.match("./index.html"))); return; }
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  })));
});
self.addEventListener("push", event => {
  let payload = { title: "Health OS", body: "Time to log your day." };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "rep-daily-reminder"
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clientsList.find(c => "focus" in c);
    if (existing) return existing.focus();
    return self.clients.openWindow("./");
  })());
});
