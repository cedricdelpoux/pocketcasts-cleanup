// Appended to the service worker by gatsby-plugin-offline

self.addEventListener("push", (event) => {
  const {title, body} = event.data.json()

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/badge.png",
      tag: "daily",
      silent: true,
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients
      .matchAll({type: "window"})
      .then((windows) =>
        windows.length ? windows[0].focus() : self.clients.openWindow("/"),
      ),
  )
})
