import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import { AuthContext } from "./authContext"

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)
  const [authError, setAuthError] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const callbackError = params.get("error_description") || params.get("error")
    return callbackError ? callbackError.replace(/\+/g, " ") : null
  })

  async function loadPlayer(userId) {
    setProfileError(null)
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) {
      setProfileError(`Impossibile caricare il profilo: ${error.message}`)
      setLoading(false)
      return null
    }
    setPlayer(data || null)
    setLoading(false)
    return data || null
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) setAuthError(error.message)
      setUser(session?.user ?? null)
      if (session?.user) queueMicrotask(() => loadPlayer(session.user.id))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadPlayer(session.user.id)
      else { setPlayer(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    })
    if (error) setAuthError(error.message)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setPlayer(null)
  }

  const refreshPlayer = async () => {
    if (user) return loadPlayer(user.id)
    return null
  }

  return (
    <AuthContext.Provider value={{ user, player, loading, authError, profileError, signInWithGoogle, signOut, refreshPlayer }}>
      {children}
    </AuthContext.Provider>
  )
}
