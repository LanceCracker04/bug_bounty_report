const CACHE = "bbr-shell-v3";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg", "/icons.svg"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("bbr-shell-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.url.startsWith("blob:") || request.url.startsWith("data:")) return;
  const url = new URL(request.url);
  // Never cache development modules, local AI requests, or user-created export
  // artifacts. These resources are ephemeral and must not be replayed later.
  if (url.origin !== self.location.origin || url.hostname === "localhost" && url.port === "11434" || url.pathname.startsWith("/@vite/") || url.pathname.startsWith("/src/") || url.pathname.startsWith("/node_modules/") || url.pathname.includes("/api/") || url.pathname.endsWith(".bbrvault") || url.pathname.endsWith(".zip") || url.pathname.endsWith(".json") || url.pathname.endsWith(".pdf")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put("/index.html", copy)); return response; }).catch(() => caches.match("/index.html")));
    return;
  }
  if (["script", "style", "font", "image"].includes(request.destination)) event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => { if (!response.ok) return response; const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)); return response; })));
});
