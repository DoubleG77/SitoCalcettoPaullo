import AppIcon from "../components/AppIcon"
import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

const C = {
  card: "#1a1a24", border: "#2a2a3a", accent: "#00e676",
  red: "#ff4444", text: "#f0f0f0", muted: "#6b6b8a",
  surface: "#13131a", gold: "#ffd700",
}

function getVoto(position, total) {
  if (total <= 1) return 6.0
  return Math.round((9.0 - (position / (total - 1)) * 6.0) * 2) / 2
}

function buildRanking(players, ratingsData) {
  // getVoto usata sotto

  const posSum = {}, posCount = {}
  ratingsData.forEach(r => {
    posSum[r.candidate_id] = (posSum[r.candidate_id] || 0) + r.position
    posCount[r.candidate_id] = (posCount[r.candidate_id] || 0) + 1
  })

  const rated = players
    .filter(p => posSum[p.id])
    .map(p => ({
      ...p,
      avgPos: posSum[p.id] / posCount[p.id],
    }))
    .sort((a, b) => a.avgPos - b.avgPos) // chi ha posizione media più bassa è più bravo

  return rated.map((p, i) => ({
    ...p,
    voto: getVoto(i, rated.length),
    globalPosition: i + 1,
  }))
}

export default function Classifica() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadStandings() {
    setLoading(true)

    const { data: matches } = await supabase
      .from("matches").select("id, score_a, score_b")

    const { data: matchPlayers } = await supabase
      .from("match_players")
      .select("match_id, player_id, team, players(name)")

    const { data: allRatings } = await supabase
      .from("ratings").select("candidate_id, position, match_id")

    if (!matches || !matchPlayers) { setLoading(false); return }

    const votoSum = {}
    const votoCount = {}

    const ratingsByMatch = {}
    allRatings?.forEach(r => {
      if (!ratingsByMatch[r.match_id]) ratingsByMatch[r.match_id] = []
      ratingsByMatch[r.match_id].push(r)
    })

    Object.entries(ratingsByMatch).forEach(([matchId, ratings]) => {
      const mpMatch = matchPlayers.filter(mp => mp.match_id === matchId)
      const players = mpMatch.map(mp => ({ id: mp.player_id, team: mp.team }))
      const ranked = buildRanking(players, ratings)
      ranked.forEach(p => {
        votoSum[p.id] = (votoSum[p.id] || 0) + p.voto
        votoCount[p.id] = (votoCount[p.id] || 0) + 1
      })
    })

    const stats = {}
    matchPlayers.forEach(mp => {
      const name = mp.players.name
      const id = mp.player_id
      if (!stats[id]) stats[id] = { name, played: 0, w: 0, d: 0, l: 0, pts: 0 }
    })

    matches.forEach(match => {
      const playersInMatch = matchPlayers.filter(mp => mp.match_id === match.id)
      playersInMatch.forEach(mp => {
        const id = mp.player_id
        const isA = mp.team === "A"
        const myScore = isA ? match.score_a : match.score_b
        const theirScore = isA ? match.score_b : match.score_a
        stats[id].played += 1
        if (myScore > theirScore) { stats[id].w += 1; stats[id].pts += 3 }
        else if (myScore < theirScore) { stats[id].l += 1 }
        else { stats[id].d += 1; stats[id].pts += 1 }
      })
    })

    const sorted = Object.entries(stats).map(([id, s]) => ({
      ...s,
      votoMedio: votoCount[id] ? Math.round((votoSum[id] / votoCount[id]) * 10) / 10 : null,
      votiPartite: votoCount[id] || 0,
    })).sort((a, b) => b.pts - a.pts || b.w - a.w)

    setStandings(sorted)
    setLoading(false)
  }

  useEffect(() => { queueMicrotask(loadStandings) }, [])

  if (loading) return (
    <div style={{
      background: "rgba(16, 35, 50, 0.85)",
      border: "1px solid rgba(148, 163, 184, 0.12)",
      borderRadius: 20,
      padding: "54px 20px",
      textAlign: "center",
      color: "#9bb2c6",
      fontWeight: 600,
    }}>
      Caricamento...
    </div>
  )

  if (standings.length === 0) return (
    <div style={{
      background: "rgba(16, 35, 50, 0.85)",
      border: "1px solid rgba(148, 163, 184, 0.12)",
      borderRadius: 20,
      padding: "54px 20px",
      textAlign: "center",
    }}>
      <AppIcon name="trophy" size={48} color="#f7c75d" strokeWidth={1.5} />
      <div style={{ color: "#edf6ff", fontSize: 18, fontWeight: 800 }}>Nessuna partita ancora</div>
    </div>
  )

  const podium = standings.slice(0, 3)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ color: "#9bb2c6", fontSize: 10, letterSpacing: 2.5, fontWeight: 700 }}>STAGIONE 2026/27</div>
          <div style={{ color: "#edf6ff", fontSize: 26, fontWeight: 900, marginTop: 4 }}>Classifica</div>
        </div>
        <div style={{
          background: "rgba(113, 240, 176, 0.08)",
          border: "1px solid rgba(113, 240, 176, 0.2)",
          color: "#71f0b0",
          borderRadius: 999,
          padding: "7px 12px",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.8,
        }}>
          {standings.length} giocatori
        </div>
      </div>

      <div style={{
        background: "linear-gradient(180deg, rgba(18, 38, 58, 0.95), rgba(13, 24, 34, 0.9))",
        borderRadius: 20,
        border: "1px solid rgba(148, 163, 184, 0.12)",
        padding: 14,
        boxShadow: "0 18px 28px rgba(2, 6, 10, 0.28)",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
      }}>
        {podium.map((player, index) => {
          const medals = ["medal", "medal", "medal"]
          const colors = ["#f7c75d", "#d1d5db", "#d39a67"]

          return (
            <div key={player.name} style={{
              background: "rgba(8, 19, 29, 0.75)",
              border: "1px solid rgba(148, 163, 184, 0.14)",
              borderRadius: 16,
              padding: "12px 10px",
              textAlign: "center",
            }}>
              <AppIcon name={medals[index]} size={24} color={colors[index]} strokeWidth={1.8} />
              <div style={{ color: "#edf6ff", fontSize: 12, fontWeight: 800, marginTop: 2 }}>{player.name}</div>
              <div style={{ color: "#9bb2c6", fontSize: 11, marginTop: 4 }}>{player.pts} pts</div>
            </div>
          )
        })}
      </div>

      <div style={{
        background: "rgba(16, 35, 50, 0.85)",
        border: "1px solid rgba(148, 163, 184, 0.12)",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 12px 30px rgba(2, 6, 10, 0.2)",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "28px 1fr 36px 36px 36px 36px 42px 48px",
          gap: 4,
          background: "rgba(8, 19, 29, 0.95)",
          padding: "10px 12px",
          color: "#8fa6ba",
          fontSize: 9,
          letterSpacing: 1.1,
          fontWeight: 800,
          textTransform: "uppercase",
        }}>
          <span>#</span>
          <span>Giocatore</span>
          <span style={{ textAlign: "center" }}>PG</span>
          <span style={{ textAlign: "center" }}>V</span>
          <span style={{ textAlign: "center" }}>P</span>
          <span style={{ textAlign: "center" }}>S</span>
          <span style={{ textAlign: "center" }}>Pt</span>
          <span style={{ textAlign: "center" }}><AppIcon name="star" size={13} color="#f7c75d" /></span>
        </div>

        {standings.map((p, i) => {
          const medalColor = i === 0 ? "#f7c75d" : i === 1 ? "#d1d5db" : i === 2 ? "#d39a67" : null
          const votoColor = p.votoMedio >= 8 ? "#f7c75d" : p.votoMedio >= 6.5 ? "#71f0b0" : p.votoMedio >= 5 ? "#edf6ff" : "#8fa6ba"
          const isLeader = i === 0

          return (
            <div key={p.name} style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 36px 36px 36px 36px 42px 48px",
              gap: 4,
              padding: "12px 12px",
              alignItems: "center",
              borderTop: "1px solid rgba(148, 163, 184, 0.12)",
              background: isLeader ? "rgba(113, 240, 176, 0.06)" : "transparent",
            }}>
              <span style={{ color: medalColor || "#8fa6ba", fontSize: 13, fontWeight: 800, display: "flex", justifyContent: "center" }}>
                {medalColor ? <AppIcon name="medal" size={16} color={medalColor} strokeWidth={1.8} /> : i + 1}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isLeader ? "#71f0b0" : "rgba(148, 163, 184, 0.5)",
                  display: "inline-block",
                }} />
                <span style={{ color: "#edf6ff", fontWeight: 700, fontSize: 13 }}>{p.name}</span>
              </div>

              <span style={{ color: "#9bb2c6", fontSize: 12, textAlign: "center" }}>{p.played}</span>
              <span style={{ color: "#71f0b0", fontSize: 12, textAlign: "center", fontWeight: 800 }}>{p.w}</span>
              <span style={{ color: "#9bb2c6", fontSize: 12, textAlign: "center" }}>{p.d}</span>
              <span style={{ color: "#ff8b9d", fontSize: 12, textAlign: "center" }}>{p.l}</span>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <span style={{
                  background: isLeader ? "#71f0b0" : "rgba(113, 240, 176, 0.12)",
                  color: isLeader ? "#08131d" : "#71f0b0",
                  borderRadius: 8,
                  padding: "4px 7px",
                  fontWeight: 900,
                  fontSize: 11,
                  minWidth: 28,
                  textAlign: "center",
                }}>{p.pts}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                {p.votoMedio ? (
                  <span style={{
                    background: `${votoColor}20`,
                    color: votoColor,
                    borderRadius: 8,
                    padding: "4px 7px",
                    fontWeight: 900,
                    fontSize: 11,
                    minWidth: 32,
                    textAlign: "center",
                  }}>{p.votoMedio}</span>
                ) : (
                  <span style={{ color: "#8fa6ba", fontSize: 11 }}>—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}