import webpush from "npm:web-push"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
)

Deno.serve(async request => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authorization = request.headers.get("Authorization")
    if (!authorization) throw new Error("Missing authorization")

    const { data: { user }, error: userError } = await supabase.auth.getUser(authorization.replace("Bearer ", ""))
    if (userError || !user) throw new Error("Invalid authorization")

    const { match_id: matchId } = await request.json()
    if (!matchId) throw new Error("match_id is required")

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, date, team_a_name, team_b_name")
      .eq("id", matchId)
      .single()
    if (matchError) throw matchError

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
    if (subscriptionError) throw subscriptionError

    const payload = JSON.stringify({
      title: "Pagelle aperte",
      body: `Nuova partita: ${match.team_a_name} - ${match.team_b_name}`,
      url: "/",
    })
    const expiredIds = []

    await Promise.all((subscriptions || []).map(async subscription => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, payload)
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) expiredIds.push(subscription.id)
        else console.error("Push delivery failed", error)
      }
    }))

    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds)
    }

    return new Response(JSON.stringify({ sent: (subscriptions || []).length - expiredIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})