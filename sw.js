const CACHE_NAME = "homehub-v1";
const URLS_TO_CACHE = [
  "/HomeHub/",
  "/HomeHub/index.html",
  "/HomeHub/style.css",
  "/HomeHub/script.js"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});