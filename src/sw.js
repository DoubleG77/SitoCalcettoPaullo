import { precacheAndRoute } from "workbox-precaching"

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener("push", event => {
  let payload = {}
  try {
    payload = event.data?.json() || {}
  } catch {
    payload = { body: event.data?.text() || "Nuova partita inserita" }
  }

  const title = payload.title || "Pagelle aperte"
  const options = {
    body: payload.body || "Nuova partita inserita: apri le pagelle e vota!",
    icon: "/logo-square.jpg",
    badge: "/logo-square.jpg",
    data: { url: payload.url || "/" },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", event => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href

  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
    const client = clientList.find(item => "focus" in item)
    if (client) {
      client.navigate(targetUrl)
      return client.focus()
    }
    return self.clients.openWindow(targetUrl)
  }))
})