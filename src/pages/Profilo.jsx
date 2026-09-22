import { useState, useEffect, useCallback } from "react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../authContext"
import { useSignedUrl } from "../hooks/useSignedUrl"
import Cropper from "react-easy-crop"
import { formatMatchDate } from "../matchDate"
import AppIcon from "../components/AppIcon"

async function getCroppedImg(imageSrc, croppedAreaPixels) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = imageSrc
  })
  const canvas = document.createElement("canvas")
  canvas.width = 300; canvas.height = 300
  const ctx = canvas.getContext("2d")
  ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 300, 300)
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.9))
}

const C = {
  card: "#12263a",
  border: "rgba(148, 163, 184, 0.16)",
  accent: "#71f0b0",
  red: "#ff7c8b",
  text: "#edf6ff",
  muted: "#9bb2c6",
  surface: "#0d1f2c",
  gold: "#f7c75d",
}

const Card = ({ children, style = {}, glow = false }) => (
  <div style={{
    background: "linear-gradient(180deg, rgba(18,38,58,0.96), rgba(13,24,34,0.92))",
    borderRadius: 20,
    padding: 18,
    border: `1px solid ${glow ? C.accent + "60" : C.border}`,
    boxShadow: glow ? "0 16px 30px rgba(0,0,0,0.22)" : "0 10px 24px rgba(2, 6, 10, 0.16)",
    ...style
  }}>{children}</div>
)

function getVoto(position, total) {
  if (total <= 1) return 6.0
  return Math.round((9.0 - (position / (total - 1)) * 6.0) * 2) / 2
}

const BASE_VOTES = null // rimosso, ora si usa getVoto

export default function Profilo() {
  const { player: currentPlayer } = useAuth()
  const [players, setPlayers] = useState([])
  const [selected, setSelected] = useState(null)
  const [stats, setStats] = useState(null)
  const [recentMatches, setRecentMatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [showOthers, setShowOthers] = useState(false)
  const [cropping, setCropping] = useState(false)
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState("")
  const { refreshPlayer } = useAuth()

  const onCropComplete = useCallback((_, pixels) => { setCroppedAreaPixels(pixels) }, [])

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setImageSrc(reader.result); setCropping(true) }
    reader.readAsDataURL(file)
  }

  const handleSavePhoto = async () => {
    setUploadingPhoto(true)
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
    const path = `${currentPlayer.id}/avatar.jpg`
    const { error } = await supabase.storage.from("Avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" })
    if (error) { alert("Errore upload: " + error.message); setUploadingPhoto(false); return }
    await supabase.from("players").update({ avatar_url: path }).eq("id", currentPlayer.id)
    await refreshPlayer()
    setCropping(false)
    setImageSrc(null)
    setUploadingPhoto(false)
    loadProfile({ ...currentPlayer, avatar_url: path })
  }

  const handleSaveName = async () => {
    const name = nameDraft.trim()
    if (!name) {
      setNameError("Inserisci un nome")
      return
    }

    setSavingName(true)
    setNameError("")
    const { error } = await supabase
      .from("players")
      .update({ name })
      .eq("id", currentPlayer.id)

    if (error) {
      setNameError("Impossibile salvare il nome")
      setSavingName(false)
      return
    }

    const updatedPlayer = { ...currentPlayer, name }
    setPlayers(prev => prev.map(player => player.id === updatedPlayer.id ? updatedPlayer : player))
    setSelected(prev => prev?.id === updatedPlayer.id ? updatedPlayer : prev)
    await refreshPlayer()
    setEditingName(false)
    setSavingName(false)
  }

  useEffect(() => {
    supabase.from("players").select("*").order("name").then(({ data }) => {
      if (data) setPlayers(data)
    })
  }, [])

  // Carica automaticamente il proprio profilo
  useEffect(() => {
    if (currentPlayer && !selected) loadProfile(currentPlayer)
  }, [currentPlayer, selected])

  async function loadProfile(player) {
    setSelected(player)
    setShowOthers(false)
    setLoading(true)

    const { data: mp } = await supabase
      .from("match_players")
      .select("match_id, team")
      .eq("player_id", player.id)

    if (!mp || mp.length === 0) {
      setStats({ played: 0, w: 0, l: 0, pts: 0, goals: 0, votoMedio: null })
      setRecentMatches([])
      setLoading(false)
      return
    }

    const matchIds = mp.map(x => x.match_id)

    const { data: matches } = await supabase
      .from("matches").select("*")
      .in("id", matchIds)
      .order("created_at", { ascending: false })

    const { data: goals } = await supabase
      .from("goals").select("match_id, count")
      .eq("player_id", player.id)

    const goalMap = {}
    goals?.forEach(g => { goalMap[g.match_id] = g.count })

    const teamMap = {}
    mp.forEach(x => { teamMap[x.match_id] = x.team })

    let w = 0, l = 0, totalGoals = 0

    const recent = matches?.map(match => {
      const team = teamMap[match.id]
      const myScore = team === "A" ? match.score_a : match.score_b
      const theirScore = team === "A" ? match.score_b : match.score_a
      const result = myScore > theirScore ? "V" : myScore < theirScore ? "S" : "P"
      const gol = goalMap[match.id] || 0
      if (result === "V") w++
      if (result === "S") l++
      totalGoals += gol
      return {
        id: match.id,
        date: formatMatchDate(match, { day: "numeric", month: "short" }),
        result, goals: gol,
        teamName: team === "A" ? match.team_a_name : match.team_b_name,
        vs: team === "A" ? match.team_b_name : match.team_a_name,
        scoreFor: myScore, scoreAgainst: theirScore,
      }
    }) || []

    // Pagella media
    const { data: allRatings } = await supabase
      .from("ratings").select("candidate_id, position, match_id")
      .in("match_id", matchIds)

    const { data: allMp } = await supabase
      .from("match_players").select("player_id, team, match_id")
      .in("match_id", matchIds)

    let votoTot = 0, votoN = 0
    const ratingsByMatch = {}
    allRatings?.forEach(r => {
      if (!ratingsByMatch[r.match_id]) ratingsByMatch[r.match_id] = []
      ratingsByMatch[r.match_id].push(r)
    })

    Object.entries(ratingsByMatch).forEach(([matchId, ratings]) => {
      const mpMatch = allMp?.filter(x => x.match_id === matchId) || []
      const posSum = {}, posCount = {}
      ratings.forEach(r => {
        posSum[r.candidate_id] = (posSum[r.candidate_id] || 0) + r.position
        posCount[r.candidate_id] = (posCount[r.candidate_id] || 0) + 1
      })
      const withAvg = mpMatch
        .filter(x => posSum[x.player_id])
        .map(x => ({ id: x.player_id, avgPos: posSum[x.player_id] / posCount[x.player_id] }))
        .sort((a, b) => a.avgPos - b.avgPos)
      const idx = withAvg.findIndex(p => p.id === player.id)
      if (idx !== -1) { votoTot += getVoto(idx, withAvg.length); votoN++ }
    })

    setStats({
      played: mp.length, w, l,
      pts: w * 3 + (mp.length - w - l),
      goals: totalGoals,
      votoMedio: votoN > 0 ? Math.round((votoTot / votoN) * 10) / 10 : null,
    })
    setRecentMatches(recent)
    setLoading(false)
  }

  const Avatar = ({ player, size = 72 }) => {
    const signedUrl = useSignedUrl(player?.avatar_url)
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0,
        background: C.accent + "20", border: `3px solid ${C.accent}60`,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {signedUrl
          ? <img src={signedUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ color: C.accent, fontWeight: 900, fontSize: size * 0.4 }}>{player?.name?.[0]}</span>
        }
      </div>
    )
  }

  // Schermata crop foto
  if (cropping) return (
    <div style={{ display: "flex", flexDirection: "column", height: "80vh" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div style={{ background: C.card, padding: "16px 24px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, marginBottom: 10, textAlign: "center" }}>ZOOM</div>
        <input type="range" min={1} max={3} step={0.05} value={zoom}
          onChange={e => setZoom(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: C.accent, marginBottom: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button onClick={() => { setCropping(false); setImageSrc(null) }} style={{
            background: "transparent", color: C.muted, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>Annulla</button>
          <button onClick={handleSavePhoto} disabled={uploadingPhoto} style={{
            background: C.accent, color: C.card, border: "none",
            borderRadius: 10, padding: "12px", fontWeight: 900, fontSize: 14, cursor: "pointer",
            opacity: uploadingPhoto ? 0.6 : 1,
          }}>{uploadingPhoto ? "Salvataggio..." : "Conferma ✓"}</button>
        </div>
      </div>
    </div>
  )

  // Pannello altri giocatori
  if (showOthers) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={() => setShowOthers(false)} style={{
        background: "transparent", border: "none", color: C.muted,
        fontSize: 13, cursor: "pointer", textAlign: "left", padding: 0,
      }}><AppIcon name="left" size={14} /> Il mio profilo</button>

      <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2 }}>TUTTI I GIOCATORI</div>

      {players.filter(p => p.id !== currentPlayer?.id).map(p => (
        <button key={p.id} onClick={() => loadProfile(p)} style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 14,
          cursor: "pointer", textAlign: "left", width: "100%",
        }}>
          <Avatar player={p} size={44} />
          <span style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>{p.name}</span>
          <AppIcon name="right" size={16} color={C.muted} />
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {selected && selected.id !== currentPlayer?.id && (
        <button onClick={() => loadProfile(currentPlayer)} style={{
          background: "transparent", border: "none", color: C.muted,
          fontSize: 13, cursor: "pointer", textAlign: "left", padding: 0,
        }}><AppIcon name="left" size={14} /> Il mio profilo</button>
      )}

      {loading ? (
        <div style={{ color: C.muted, textAlign: "center", padding: 60 }}>Caricamento...</div>
      ) : (
        <>
          <Card glow style={{ textAlign: "center", padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, position: "relative", width: "fit-content", margin: "0 auto 12px" }}>
              <Avatar player={selected} size={72} />
              {selected?.id === currentPlayer?.id && (
                <>
                  <label htmlFor="avatar-change" style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 26, height: 26, borderRadius: "50%",
                    background: C.accent, border: `2px solid ${C.card}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 13,
                  }}><AppIcon name="camera" size={14} color={C.card} /></label>
                  <input id="avatar-change" type="file" accept="image/*"
                    onChange={handlePhotoSelect} style={{ display: "none" }} />
                </>
              )}
            </div>
            {editingName && selected?.id === currentPlayer?.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 280, margin: "0 auto" }}>
                <input
                  value={nameDraft}
                  onChange={e => { setNameDraft(e.target.value); setNameError("") }}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveName() }}
                  autoFocus
                  maxLength={40}
                  aria-label="Nome del profilo"
                  style={{
                    width: "100%", boxSizing: "border-box", background: C.surface,
                    color: C.text, border: `1px solid ${nameError ? C.red : C.accent}`,
                    borderRadius: 8, padding: "10px 12px", fontSize: 18,
                    fontWeight: 700, textAlign: "center", outline: "none",
                  }}
                />
                {nameError && <div style={{ color: C.red, fontSize: 12 }}>{nameError}</div>}
                <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                  <button onClick={() => { setEditingName(false); setNameError("") }} disabled={savingName} style={{
                    background: "transparent", color: C.muted, border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer",
                  }}>Annulla</button>
                  <button onClick={handleSaveName} disabled={savingName} style={{
                    background: C.accent, color: C.card, border: "none",
                    borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 800,
                    cursor: "pointer", opacity: savingName ? 0.6 : 1,
                  }}>{savingName ? "Salvataggio..." : "Salva"}</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ color: C.text, fontSize: 22, fontWeight: 900 }}>{selected?.name}</div>
                {selected?.id === currentPlayer?.id && (
                  <button
                    onClick={() => { setNameDraft(selected.name); setNameError(""); setEditingName(true) }}
                    aria-label="Modifica nome profilo"
                    title="Modifica nome"
                    style={{
                      background: "transparent", border: "none", color: C.muted,
                      cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4,
                    }}
                  ><AppIcon name="edit" size={16} color={C.muted} /></button>
                )}
              </div>
            )}
            {selected?.id === currentPlayer?.id && (
              <div style={{ color: C.accent, fontSize: 12, marginTop: 4 }}>Il tuo profilo</div>
            )}
          </Card>

          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Gol totali", val: stats.goals, icon: "goals" },
                { label: "Partite", val: stats.played, icon: "calendar" },
                { label: "Vittorie", val: stats.w, icon: "success" },
                { label: "Pagella media", val: stats.votoMedio ?? "—", icon: "star" },
              ].map(s => (
                <Card key={s.label} style={{ textAlign: "center", padding: 16 }}>
                  <AppIcon name={s.icon} size={24} color={C.accent} strokeWidth={1.8} />
                  <div style={{ color: C.accent, fontSize: 22, fontWeight: 900 }}>{s.val}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{s.label}</div>
                </Card>
              ))}
            </div>
          )}

          {recentMatches.length > 0 && (
            <Card>
              <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, marginBottom: 14 }}>ULTIME PARTITE</div>
              {recentMatches.slice(0, 5).map((m, i) => (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                  borderBottom: i < Math.min(recentMatches.length, 5) - 1 ? `1px solid ${C.border}` : "none",
                }}>
                  <span style={{ color: C.muted, fontSize: 12, width: 44, flexShrink: 0 }}>{m.date}</span>
                  <span style={{
                    width: 24, height: 24, borderRadius: 4, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800,
                    background: m.result === "V" ? C.accent + "20" : m.result === "S" ? C.red + "20" : C.muted + "20",
                    color: m.result === "V" ? C.accent : m.result === "S" ? C.red : C.muted,
                  }}>{m.result}</span>
                  <span style={{ color: C.muted, fontSize: 12, flex: 1 }}>
                    {m.teamName} <span style={{ fontSize: 11 }}>vs</span> {m.vs}
                  </span>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {m.scoreFor}–{m.scoreAgainst}
                  </span>
                  {m.goals > 0 && (
                    <span style={{ color: C.accent, fontSize: 12, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 3 }}><AppIcon name="goals" size={13} /> {m.goals}</span>
                  )}
                </div>
              ))}
            </Card>
          )}

          {recentMatches.length === 0 && stats?.played === 0 && (
            <Card style={{ textAlign: "center", padding: 32 }}>
              <div style={{ color: C.muted, fontSize: 14 }}>Nessuna partita ancora</div>
            </Card>
          )}
        </>
      )}

      {/* Bottone vedere altri */}
      <button onClick={() => setShowOthers(true)} style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "14px 18px",
        color: C.muted, fontSize: 14, fontWeight: 600,
        cursor: "pointer", marginTop: 4,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        👥 Vedi profili altri giocatori
      </button>
    </div>
  )
}