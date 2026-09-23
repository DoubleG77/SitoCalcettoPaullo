import { supabase } from "./supabaseClient"

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(character => character.charCodeAt(0)))
}

function isPushSupported() {
  return Boolean(
    VAPID_PUBLIC_KEY &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window,
  )
}

export async function registerPushSubscription(userId) {
  if (!userId || !isPushSupported() || Notification.permission !== "granted") {
    return null
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = subscription.toJSON()
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    expiration_time: subscription.expirationTime,
    user_agent: navigator.userAgent,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" })
  if (error) throw error

  return subscription
}

export async function sendMatchNotification(matchId) {
  const { error } = await supabase.functions.invoke("send-match-notification", {
    body: { match_id: matchId },
  })
  if (error) throw error
}