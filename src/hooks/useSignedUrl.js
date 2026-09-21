import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

export function useSignedUrl(path) {
  const [url, setUrl] = useState(null)
  const directUrl = path?.startsWith("http") ? path : null

  useEffect(() => {
    if (!path || directUrl) return

    supabase.storage.from("Avatars")
      .createSignedUrl(path, 3600)
      .then(({ data }) => { if (data) setUrl(data.signedUrl) })
  }, [path, directUrl])

  return directUrl || url
}