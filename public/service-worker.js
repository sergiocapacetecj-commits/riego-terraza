self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title || "🌿 Jardín", {
      body: data.body || "Tienes un aviso de riego.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  );
});