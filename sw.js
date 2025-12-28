const CACHE_NAME = "vrijgezellenmatti-v16";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/firebase.js",
  "./js/levels.js",
  "./js/gps.js",
  "./js/admin.js",
  "./js/app.js",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-192.png",
  "./img/boot.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE_NAME)
            .map(k => caches.delete(k))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigaties: altijd de shell teruggeven (offline-vriendelijk)
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then(cached => cached || fetch(req))
    );
    return;
  }

  // Statische assets: cache-first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      });
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const levelIndex = event.notification?.data?.levelIndex;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientsArr => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.postMessage({ type: "arrival", levelIndex });
          return client.focus();
        }
      }
      const url = `./index.html?notify=1&level=${levelIndex ?? ""}`;
      return self.clients.openWindow(url);
    })
  );
});
