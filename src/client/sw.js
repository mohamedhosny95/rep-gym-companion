importScripts("./compatibility.js","./media-contract.js");
const BUILD_VERSION="__BUILD_VERSION__";
const CACHE = `awj-companion-${BUILD_VERSION}`;
const MEDIA_CACHE = AWJ_MEDIA_CONTRACT.CACHE_NAME;
const versioned=path=>`${path}?v=${BUILD_VERSION}`;
const CORE_ASSETS = ["./", "./index.html", ...["./compatibility.js","./styles.css","./screens.css","./awj-theme.css","./vendor/dompurify.min.js","./safe-dom.js","./build-meta.js","./auth.js","./storage.js","./ui-state.js","./ui-shell.js","./health-data.js","./features.js","./health-engine.js", "./health-summary.js", "./appearance.js","./health-coverage.js","./performance-insights.js","./product-suite.js","./adaptive-coach.js","./training-session.js","./navigation.js","./offline-nutrition.js","./store.js","./importer.js","./report-card.js","./recovery-map.js","./plate-calculator.js","./custom-workouts.js","./bootstrap.js","./exercise-catalog.js","./training-preferences.js","./app-shell.js","./technique-guides.js","./workout-media.js","./media-manifest.js","./media-contract.js","./motion.js","./media-player.js","./app.js","./sync-outbox.js","./telemetry.js","./sync.js","./sync-center.js","./enhancements.js","./habits.js","./health-ui.js","./performance-ui.js","./product-suite-ui.js"].map(versioned), "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const ATLAS_ASSETS = ["./assets/gym-anatomy-atlas.webp", "./assets/mobility-anatomy-atlas.webp", "./assets/core-anatomy-atlas.webp", "./assets/cardio-anatomy-atlas.webp", "./assets/gym-anatomy-front-atlas.webp", "./assets/mobility-anatomy-front-atlas.webp", "./assets/core-anatomy-front-atlas.webp", "./assets/cardio-anatomy-front-atlas.webp", "./assets/priority-motion-atlas.webp"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE_ASSETS))));
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // A tab running the preceding build can still request its versioned tools.
    const isCoreCache=k=>k.startsWith('awj-companion-')||k.startsWith(AWJ_COMPAT.legacyCachePrefix);
    const previousCore=keys.filter(k=>isCoreCache(k)&&k!==CACHE).slice(-1);
    await Promise.all(keys.filter(k=>isCoreCache(k)&&k!==CACHE&&!previousCore.includes(k)).map(k=>caches.delete(k)));
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
  if (event.request.mode === "navigate") { event.respondWith(fetch(event.request).then(response => { const copy=response.clone();caches.open(CACHE).then(cache=>cache.put("./index.html",copy));return response; }).catch(()=>caches.open(CACHE).then(cache=>cache.match("./index.html")).then(hit=>hit||caches.match("./index.html")))); return; }
  const mediaUrl=new URL(event.request.url);
  if(mediaUrl.pathname.includes("/assets/exercises/")){
    event.respondWith((async()=>{const cache=await caches.open(MEDIA_CACHE),plain=new Request(event.request.url),hit=await cache.match(plain);if(hit)return AWJ_MEDIA_CONTRACT.rangeResponse(hit,event.request.headers.get("Range"));const response=await fetch(event.request);if(AWJ_MEDIA_CONTRACT.complete(response,/\.mp4$/.test(mediaUrl.pathname)?"video":"image"))event.waitUntil(cache.put(plain,response.clone()));return response;})().catch(()=>new Response("",{status:503,statusText:"Media unavailable"})));return;
  }
  event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreSearch:false})).then(hit=>hit||caches.match(event.request, { ignoreSearch: false })).then(hit => hit || fetch(event.request).then(response => {
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  })).catch(() => new Response("", { status: 408, statusText: "Offline" })));
});
self.addEventListener("push", event => {
  let payload = { title: "AWJ", body: "Time to log your day." };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "awj-daily-reminder",
    data: payload.data || { url: "./" },
    actions: payload.actions || []
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const action = event.action;
  const targetPath = action === "log-sleep" ? "./?quick=health&action=sleep"
    : action === "log-meal" ? "./?quick=food"
    : action === "open-habits" ? "./?quick=home"
    : action === "resume-workout" || action === "open-workout" ? "./?quick=train&action=resume"
    : action === "open-weekly" ? "./?quick=insights"
    : (event.notification.data?.url || "./");
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = clientsList.find(c => "focus" in c);
    if (existing) {
      if ("navigate" in existing) existing.navigate(targetPath);
      return existing.focus();
    }
    return self.clients.openWindow(targetPath);
  })());
});

self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting();});
