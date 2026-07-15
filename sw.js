// Kvitts service worker – cache-first för app-skalet (se docs/features/015-pwa.md).
//
// VIKTIGT: bumpa CACHE_NAME manuellt vid deploys som ändrar cachade assets
// (index.html, app.js, logic.js, supabase.js, config.js, ikoner, manifest).
// Annars servas den gamla versionen ur cachen för alltid.
const CACHE_NAME = "kvitts-v9";

const APP_SKAL = [
  "/",
  "/index.html",
  "/config.js",
  "/logic.js",
  "/supabase.js",
  "/app.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
];

// Pre-cacha app-skalet vid install.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SKAL))
  );
  self.skipWaiting();
});

// Rensa gamla cache-versioner vid aktivering.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nycklar) =>
      Promise.all(
        nycklar.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Cache-first: serva ur cache, fall tillbaka till nätverk.
// Endast GET och samma origin cachas – Supabase-anrop m.m. går alltid till nätet.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cachat) => {
      if (cachat) return cachat;
      return fetch(req)
        .then((svar) => {
          // Cacha nya samma-origin-GET-svar för framtida offline-bruk.
          if (svar && svar.status === 200 && svar.type === "basic") {
            const kopia = svar.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, kopia));
          }
          return svar;
        })
        .catch(() => {
          // Offline och inget i cachen: för navigeringar, ge app-skalet.
          if (req.mode === "navigate") return caches.match("/index.html");
          return Promise.reject(new Error("offline"));
        });
    })
  );
});
