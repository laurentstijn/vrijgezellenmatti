self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("laatste-code-v1").then(cache =>
      cache.addAll([
        "./",
        "./index.html",
        "./css/style.css",
        "./js/app.js"
      ])
    )
  );
});
