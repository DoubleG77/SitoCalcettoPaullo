const STORAGE_KEY = "calcetto_notifications"

export function getStoredNotifications() {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function dismissStoredNotification(id) {
  if (typeof window === "undefined") return

  const current = getStoredNotifications().filter(item => item.id !== id)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}

export function notifyMatchAdded() {
  const title = "Pagelle aperte"
  const body = "Nuova partita inserita: apri le pagelle e vota!"

  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    body,
    createdAt: new Date().toISOString(),
  }

  if (typeof window !== "undefined") {
    const current = getStoredNotifications()
    const next = [entry, ...current].slice(0, 8)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        const notification = new Notification(title, {
          body,
          icon: "/logo-square.jpg",
        })

        setTimeout(() => {
          notification.close?.()
        }, 6000)
      }
    }
  }

  return entry
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported"
  }

  if (Notification.permission === "default") {
    return Notification.requestPermission()
  }

  return Notification.permission
}
