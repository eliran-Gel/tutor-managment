// Minimal service worker: exists only to receive Web Push events and
// route a tap on the resulting notification to the right page. No offline
// caching/shell precaching - that's a separate concern this app doesn't
// need yet.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "התראה חדשה";
  const options = {
    body: data.body || "",
    icon: "/icon-192",
    badge: "/icon-192",
    dir: "rtl",
    lang: "he",
    data: { link_path: data.link_path || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const linkPath = event.notification.data?.link_path || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(linkPath) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(linkPath);
    }),
  );
});
