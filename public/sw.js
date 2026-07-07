// Minimal service worker — its only job is to make the app installable
// as a Google-signed WebAPK (no offline caching, to avoid stale content).
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network passthrough — required so Chrome treats the site as an
  // installable PWA and mints a WebAPK.
  event.respondWith(fetch(event.request).catch(() => Response.error()));
});
