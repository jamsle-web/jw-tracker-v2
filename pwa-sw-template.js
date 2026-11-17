const CACHE_NAME = "__CACHE_NAME__";
const PRECACHE_MANIFEST = "/precache-manifest.json";
const CACHE_PREFIX = "jw-tracker-";

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const response = await fetch(PRECACHE_MANIFEST, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar el inventario de archivos sin conexión.");
    const urls = await response.json();
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urls);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("/index.html", response.clone());
        }
        return response;
      } catch (error) {
        const cachedPage = await caches.match("/index.html");
        if (cachedPage) return cachedPage;
        throw error;
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
