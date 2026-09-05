// Retirement worker for pre-observatory installations. Never intercept requests.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key.startsWith("meridian-shell-"))
          .map(key => caches.delete(key))
      );
      await self.registration.unregister();
    })()
  );
});
