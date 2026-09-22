import { supabase } from "../supabaseClient"
import { useAuth } from "../authContext"
import { useState, useEffect, useRef } from "react"
import { formatMatchDate } from "../matchDate"
import AppIcon from "../components/AppIcon"

const C = {
  card: "#1a1a24", border: "#2a2a3a", accent: "#00e676",
  red: "#ff4444", text: "#f0f0f0", muted: "#6b6b8a",
  surface: "#13131a", gold: "#ffd700",
}

const Card = ({ children, style = {}, glow = false }) => (
  <div style={{
    background: C.card, borderRadius: 12, padding: 18,
    border: `1px solid ${glow ? C.accent + "60" : C.border}`,
    boxShadow: glow ? `0 0 24px ${C.accent}15` : "none",
    ...style
  }}>{children}</div>
)

const Badge = ({ children, color = C.accent }) => (
  <span style={{
    background: color + "20", color, border: `1px solid ${color}40`,
    borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 1,
  }}>{children}</span>
)

function getVoto(position, total) {
  if (total <= 1) return 6.0
  return Math.round((9.0 - (position / (total - 1)) * 6.0) * 2) / 2
}

function buildRanking(players, ratingsData) {
  const posSum = {}, posCount = {}
  ratingsData.forEach(r => {
    posSum[r.candidate_id] = (posSum[r.candidate_id] || 0) + r.position
    posCount[r.candidate_id] = (posCount[r.candidate_id] || 0) + 1
  })
  return players
    .filter(p => posSum[p.id])
    .map(p => ({ ...p, avgPos: posSum[p.id] / posCount[p.id] }))
    .sort((a, b) => a.avgPos - b.avgPos)
    .map((p, i, arr) => ({ ...p, voto: getVoto(i, arr.length) }))
}

function buildIndividualRatings(players, ratingsData, teamMap, currentPlayerId) {
  const playersMap = Object.fromEntries(players.map(p => [p.id, p]))
  const voters = {}

  ratingsData.forEach(rating => {
    if (!rating.voter_id || rating.voter_id === currentPlayerId) return

    if (!voters[rating.voter_id]) {
      voters[rating.voter_id] = {
        id: rating.voter_id,
        name: playersMap[rating.voter_id]?.name || "Votante non riconosciuto",
        playersA: [],
        playersB: [],
      }
    }

    const candidate = playersMap[rating.candidate_id]
    if (!candidate || !Number.isFinite(Number(rating.position))) return

    const ratedPlayer = { ...candidate, position: Number(rating.position) }
    if (teamMap[candidate.id] === "B") voters[rating.voter_id].playersB.push(ratedPlayer)
    else voters[rating.voter_id].playersA.push(ratedPlayer)
  })

  return Object.values(voters)
    .map(voter => ({
      ...voter,
      playersA: voter.playersA.sort((a, b) => a.position - b.position),
      playersB: voter.playersB.sort((a, b) => a.position - b.position),
    }))
    .filter(voter => voter.playersA.length > 0 || voter.playersB.length > 0)
}

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    if (!targetDate) return
    const update = () => {
      const diff = new Date(targetDate) - new Date()
      if (diff <= 0) { setTimeLeft("Scaduto"); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(`${h}h ${m}m`)
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

function DraggableList({ players, color, onReorder }) {
  const [items, setItems] = useState(players)
  const dragIndex = useRef(null)
  const dragOverIdx = useRef(null)
  const touchStartY = useRef(null)
  const touchItem = useRef(null)

  useEffect(() => { setItems(players) }, [players])

  // Desktop drag
  const handleDragStart = (i) => { dragIndex.current = i }
  const handleDragEnter = (i) => { dragOverIdx.current = i }
  const handleDragEnd = () => {
    if (dragIndex.current === null || dragOverIdx.current === null || dragIndex.current === dragOverIdx.current) return
    const updated = [...items]
    const [moved] = updated.splice(dragIndex.current, 1)
    updated.splice(dragOverIdx.current, 0, moved)
    setItems(updated)
    onReorder(updated)
    dragIndex.current = null
    dragOverIdx.current = null
  }

  // Touch drag
  const handleTouchStart = (e, i) => {
    touchItem.current = i
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    const y = e.touches[0].clientY
    const elements = document.elementsFromPoint(e.touches[0].clientX, y)
    const target = elements.find(el => el.dataset.idx !== undefined)
    if (target) dragOverIdx.current = parseInt(target.dataset.idx)
  }

  const handleTouchEnd = () => {
    if (touchItem.current === null || dragOverIdx.current === null || touchItem.current === dragOverIdx.current) {
      touchItem.current = null; dragOverIdx.current = null; return
    }
    const updated = [...items]
    const [moved] = updated.splice(touchItem.current, 1)
    updated.splice(dragOverIdx.current, 0, moved)
    setItems(updated)
    onReorder(updated)
    touchItem.current = null
    dragOverIdx.current = null
  }

  return (
    <div>
      {items.map((player, i) => (
        <div
          key={player.id}
          data-idx={i}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragEnter={() => handleDragEnter(i)}
          onDragEnd={handleDragEnd}
          onDragOver={e => e.preventDefault()}
          onTouchStart={e => handleTouchStart(e, i)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", marginBottom: 8,
            background: C.surface, borderRadius: 10,
            border: `1px solid ${C.border}`,
            cursor: "grab", userSelect: "none",
            touchAction: "none",  // ← disabilita scroll durante drag
          }}
        >
          <span style={{ color, fontWeight: 900, fontSize: 16, width: 24, textAlign: "center" }}>{i + 1}</span>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: color + "20", border: `1px solid ${color}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color, fontSize: 15, fontWeight: 900,
          }}>{player.name[0]}</div>
          <span style={{ color: C.text, fontWeight: 600, fontSize: 15, flex: 1 }}>{player.name}</span>
          <span style={{ color: C.muted, fontSize: 18 }}>⠿</span>
        </div>
      ))}
    </div>
  )
}

export default function Pagelle() {
  const { player } = useAuth()
  const [lastMatch, setLastMatch] = useState(null)
  const [playersA, setPlayersA] = useState([])
  const [playersB, setPlayersB] = useState([])
  const [phase, setPhase] = useState("intro")
  const [rankingA, setRankingA] = useState([])
  const [rankingB, setRankingB] = useState([])
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasVoted, setHasVoted] = useState(false)
  const [voterCount, setVoterCount] = useState(0)
  const [individualRatings, setIndividualRatings] = useState([])
  const [expandedVoter, setExpandedVoter] = useState(null)
  const [voteDeadline, setVoteDeadline] = useState(null)
  const [saveError, setSaveError] = useState("")

  const countdown = useCountdown(voteDeadline)

  async function loadVoterCount(matchId) {
    const { data } = await supabase
      .from("ratings")
      .select("voter_id")
      .eq("match_id", matchId)
      .not("voter_id", "is", null)

    if (data) {
      const unique = new Set(data.map(r => r.voter_id))
      setVoterCount(unique.size)
    }
  }

  async function loadResults(matchId) {
    const { data } = await supabase
      .from("ratings").select("voter_id, candidate_id, position")
      .eq("match_id", matchId)
    if (!data || data.length === 0) return

    const ids = [...new Set(data.flatMap(r => [r.candidate_id, r.voter_id]).filter(Boolean))]
    const { data: playersData } = await supabase
      .from("players").select("id, name").in("id", ids)
    if (!playersData) return

    const { data: mp } = await supabase
      .from("match_players").select("player_id, team").eq("match_id", matchId)
    const teamMap = {}
    mp?.forEach(p => { teamMap[p.player_id] = p.team })

    const players = playersData.map(p => ({ ...p, team: teamMap[p.id] || "A" }))
    setResults(buildRanking(players, data))
    setIndividualRatings(buildIndividualRatings(playersData, data, teamMap, player?.id))
  }

  async function loadLastMatch() {
    setLoading(true)
    const { data: match } = await supabase
      .from("matches").select("*")
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle()

    if (!match) { setLoading(false); return }
    setLastMatch(match)

    // Deadline = 24h dopo la creazione della partita
    const deadline = new Date(match.created_at)
    deadline.setHours(deadline.getHours() + 24)
    setVoteDeadline(deadline)

    const { data: mp } = await supabase
      .from("match_players")
      .select("team, players(id, name)")
      .eq("match_id", match.id)

    if (mp) {
      const pA = mp.filter(x => x.team === "A").map(x => x.players)
      const pB = mp.filter(x => x.team === "B").map(x => x.players)
      setPlayersA(pA)
      setPlayersB(pB)
      setRankingA(pA)
      setRankingB(pB)
    }

    // Controlla se l'utente ha già votato
    if (player) {
      const { data: myVote } = await supabase
        .from("ratings")
        .select("id")
        .eq("match_id", match.id)
        .eq("voter_id", player.id)
        .limit(1)
        .maybeSingle()
      setHasVoted(!!myVote)
    }

    await loadResults(match.id)
    await loadVoterCount(match.id)
    setLoading(false)
  }

  // loadLastMatch intentionally runs once when the page mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { queueMicrotask(loadLastMatch) }, [])

  async function handleSave() {
    if (isExpired) {
      setSaveError("La votazione è scaduta")
      return
    }

    setSaving(true)
    setSaveError("")
    // Controllo doppio voto
    const { data: existing } = await supabase
      .from("ratings")
      .select("id")
      .eq("match_id", lastMatch.id)
      .eq("voter_id", player.id)  // ← player.id
      .limit(1)
      .maybeSingle()

    if (existing) {
      setHasVoted(true)
      setSaving(false)
      setPhase("intro")
      return
    }

    // Insert rows
    const rows = [
      ...rankingA.map((p, i) => ({
        match_id: lastMatch.id,
        candidate_id: p.id,
        voter_id: player.id,  // ← player.id
        position: i + 1,
        wins: 0,
      })),
      ...rankingB.map((p, i) => ({
        match_id: lastMatch.id,
        candidate_id: p.id,
        voter_id: player.id,  // ← player.id
        position: i + 1,
        wins: 0,
      })),
    ]

    const { error } = await supabase.from("ratings").insert(rows)
    if (error) {
      if (error.code === "23505") {
        setHasVoted(true)
        setSaveError("Hai già votato per questa partita")
      } else {
        setSaveError(`Errore nel salvataggio: ${error.message}`)
      }
      setSaving(false)
      return
    }

    setHasVoted(true)
    await loadResults(lastMatch.id)
    await loadVoterCount(lastMatch.id)
    setSaving(false)
    setPhase("results")
  }

  if (loading) return <div style={{ color: C.muted, textAlign: "center", padding: 60 }}>Caricamento...</div>

  if (!lastMatch) return (
    <div style={{ textAlign: "center", padding: 60 }}>
      <AppIcon name="ratings" size={48} color={C.accent} strokeWidth={1.5} />
      <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>Nessuna partita ancora</div>
    </div>
  )

  const date = formatMatchDate(lastMatch, { day: "numeric", month: "long" })
  const isExpired = voteDeadline && new Date() > new Date(voteDeadline)

  // Card partecipazione
  const PartecipazoneCard = () => (
    <Card style={{
      background: `linear-gradient(135deg, ${C.accent}10, ${C.accent}05)`,
      border: `1px solid ${C.accent}30`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2 }}>VOTANTI: </div>
          <span style={{ color: C.accent, fontWeight: 900, fontSize: 18 }}>
            {voterCount === 0 ? "—" : voterCount}
          </span>
          <span style={{ color: C.muted, fontSize: 12 }}>
            {voterCount === 0 ? "Nessuno ha ancora votato" : voterCount === 1 ? "persona ha votato" : "persone hanno votato"}
          </span>
        </div>
        {isExpired
          ? <Badge color={C.red}>Scaduto</Badge>
          : <Badge color={C.accent}><AppIcon name="calendar" size={12} /> {countdown}</Badge>
        }
      </div>
    </Card>
  )

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === "intro") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card glow style={{ textAlign: "center", padding: 32 }}>
        <AppIcon name="ratings" size={48} color={C.accent} strokeWidth={1.5} />
        <div style={{ color: C.text, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>
          Pagelle · {date}
        </div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 6 }}>
          {lastMatch.team_a_name} {lastMatch.score_a} — {lastMatch.score_b} {lastMatch.team_b_name}
        </div>
        <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.9, marginBottom: 24 }}>
          Ordina i giocatori di ogni squadra<br />
          dal migliore al peggiore.<br />
          <span style={{ color: C.accent, fontWeight: 700 }}>Trascina per riordinare.</span>
        </div>

        {hasVoted ? (
          <div style={{
            background: C.accent + "15", border: `1px solid ${C.accent}40`,
            borderRadius: 10, padding: "12px 20px", marginBottom: 16,
            color: C.accent, fontWeight: 700, fontSize: 14,
          }}><AppIcon name="success" size={16} /> Hai già votato per questa partita</div>
        ) : isExpired ? (
          <div style={{
            background: C.red + "15", border: `1px solid ${C.red}40`,
            borderRadius: 10, padding: "12px 20px", marginBottom: 16,
            color: C.red, fontWeight: 700, fontSize: 14,
          }}><AppIcon name="alert" size={16} /> Votazione scaduta</div>
        ) : (
          <button onClick={() => setPhase("rankA")} style={{
            background: C.accent, color: C.card, border: "none",
            borderRadius: 10, padding: "14px 40px", fontWeight: 900,
            fontSize: 15, cursor: "pointer",
          }}>VOTA ORA <AppIcon name="right" size={16} /></button>
        )}
      </Card>

      <PartecipazoneCard />

      {results.length > 0 && (
        <Card>
          <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>
            PAGELLE ATTUALI
          </div>
          {results.slice(0, 6).map((r, i) => {
            const votoColor = r.voto >= 8 ? C.gold : r.voto >= 6.5 ? C.accent : r.voto >= 5 ? C.text : C.muted
            return (
              <div key={r.name} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0", borderBottom: i < 5 ? `1px solid ${C.border}` : "none"
              }}>
                <span style={{ color: C.muted, width: 20 }}>{i + 1}</span>
                <span style={{ color: C.text, flex: 1, fontWeight: 600 }}>{r.name}</span>
                <span style={{
                  background: votoColor + "20", color: votoColor,
                  borderRadius: 6, padding: "2px 10px", fontWeight: 900,
                }}>{r.voto}</span>
              </div>
            )
          })}
        </Card>
      )}

      <div>
        <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, margin: "4px 0 10px" }}>
          PAGELLE DEGLI ALTRI
        </div>
        {individualRatings.length === 0 ? (
          <Card>
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>
              {voterCount > 0 ? "Nessun altro votante da mostrare" : "Nessuno ha ancora pubblicato una pagella"}
            </div>
          </Card>
        ) : (
          individualRatings.map(voter => {
            const isExpanded = expandedVoter === voter.id
            return (
              <Card key={voter.id} style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
                <button
                  onClick={() => setExpandedVoter(isExpanded ? null : voter.id)}
                  aria-expanded={isExpanded}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    background: "transparent", color: C.text, border: "none",
                    padding: "14px 18px", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: C.accent + "20", color: C.accent,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900,
                  }}>{voter.name[0]?.toUpperCase()}</span>
                  <span style={{ flex: 1, fontWeight: 700 }}>{voter.name}</span>
                  <span style={{ color: C.muted, fontSize: 16 }}>{isExpanded ? <AppIcon name="up" size={16} /> : <AppIcon name="down" size={16} />}</span>
                </button>

                {isExpanded && (
                  <div style={{
                    borderTop: `1px solid ${C.border}`, padding: "12px 18px 16px",
                    background: C.surface,
                  }}>
                    {[
                      { name: lastMatch.team_a_name, players: voter.playersA, color: C.accent },
                      { name: lastMatch.team_b_name, players: voter.playersB, color: C.red },
                    ].map((team, teamIndex) => (
                      <div key={team.name} style={{ marginBottom: teamIndex === 0 ? 12 : 0 }}>
                        <div style={{ color: team.color, fontSize: 10, letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>
                          {team.name.toUpperCase()}
                        </div>
                        {team.players.length === 0 ? (
                          <div style={{ color: C.muted, fontSize: 12 }}>Nessun voto disponibile</div>
                        ) : team.players.map(ratedPlayer => (
                          <div key={ratedPlayer.id} style={{ display: "flex", gap: 8, padding: "4px 0" }}>
                            <span style={{ color: team.color, fontWeight: 900, width: 18 }}>{ratedPlayer.position}</span>
                            <span style={{ color: C.text, fontSize: 13 }}>{ratedPlayer.name}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )

  // ── RANKING SQUADRA A ──────────────────────────────────────────────────────
  if (phase === "rankA") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Badge color={C.accent}>1 / 2 · {lastMatch.team_a_name}</Badge>
          <span style={{ color: C.muted, fontSize: 12 }}>Squadra A</span>
        </div>
        <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 10 }}>
          <div style={{ width: "50%", height: "100%", background: C.accent, borderRadius: 2 }} />
        </div>
      </Card>
      <Card>
        <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, marginBottom: 16 }}>
          ORDINA DAL MIGLIORE AL PEGGIORE
        </div>
        <DraggableList players={rankingA} color={C.accent} onReorder={setRankingA} />
      </Card>
      <button onClick={() => setPhase("rankB")} style={{
        background: C.accent, color: C.card, border: "none",
        borderRadius: 10, padding: "14px", fontWeight: 900, fontSize: 15, cursor: "pointer",
      }}>AVANTI <AppIcon name="right" size={16} /> {lastMatch.team_b_name}</button>
      <button onClick={() => setPhase("intro")} style={{
        background: "transparent", color: C.muted,
        border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "10px", fontSize: 12, cursor: "pointer",
      }}><AppIcon name="close" size={14} /> Annulla votazione</button>
    </div>
  )

  // ── RANKING SQUADRA B ──────────────────────────────────────────────────────
  if (phase === "rankB") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Badge color={C.red}>2 / 2 · {lastMatch.team_b_name}</Badge>
          <span style={{ color: C.muted, fontSize: 12 }}>Squadra B</span>
        </div>
        <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 10 }}>
          <div style={{ width: "100%", height: "100%", background: C.red, borderRadius: 2 }} />
        </div>
      </Card>
      <Card>
        <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, marginBottom: 16 }}>
          ORDINA DAL MIGLIORE AL PEGGIORE
        </div>
        <DraggableList players={rankingB} color={C.red} onReorder={setRankingB} />
      </Card>
      <button onClick={handleSave} disabled={saving} style={{
        background: C.accent, color: C.card, border: "none",
        borderRadius: 10, padding: "14px", fontWeight: 900,
        fontSize: 15, cursor: "pointer", opacity: saving ? 0.6 : 1,
      }}>{saving ? "SALVATAGGIO..." : <>SALVA PAGELLE <AppIcon name="check" size={16} /></>}</button>
      {saveError && (
        <div role="alert" style={{
          background: C.red + "15", border: `1px solid ${C.red}40`,
          borderRadius: 10, color: C.red, padding: "11px 13px", fontSize: 13,
          textAlign: "center",
        }}>{saveError}</div>
      )}
      <button onClick={() => setPhase("rankA")} style={{
        background: "transparent", color: C.muted,
        border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "8px", fontSize: 12, cursor: "pointer",
      }}><AppIcon name="left" size={14} /> Torna a {lastMatch.team_a_name}</button>
      <button onClick={() => { setPhase("intro"); setRankingA(playersA); setRankingB(playersB) }} style={{
        background: "transparent", color: C.red + "90",
        border: `1px solid ${C.red}30`, borderRadius: 8,
        padding: "10px", fontSize: 12, cursor: "pointer",
      }}><AppIcon name="close" size={14} /> Annulla votazione</button>
    </div>
  )

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (phase === "results") {
    const mvp = results[0]
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card glow style={{ textAlign: "center", padding: 28 }}>
          <AppIcon name="trophy" size={52} color={C.gold} strokeWidth={1.5} />
          <div style={{ color: C.gold, fontSize: 26, fontWeight: 900 }}>{mvp?.name}</div>
          <div style={{ color: C.text, fontSize: 14, marginTop: 4 }}>MVP della partita · {date}</div>
        </Card>

        <PartecipazoneCard />

        <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2 }}>PAGELLE COMPLETE</div>
        {results.map((r, i) => {
          const votoColor = r.voto >= 8 ? C.gold : r.voto >= 6.5 ? C.accent : r.voto >= 5.5 ? C.text : C.muted
          return (
            <div key={r.name} style={{
              background: C.card, border: `1px solid ${i === 0 ? C.gold + "50" : C.border}`,
              borderRadius: 12, padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: i === 0 ? `0 0 20px ${C.gold}10` : "none",
            }}>
              <span style={{ color: C.muted, width: 24, fontSize: 14 }}>
                {i < 3 ? <AppIcon name="medal" size={16} color={[C.gold, "#d1d5db", "#d39a67"][i]} strokeWidth={1.8} /> : i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>{r.name}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                  posizione media {r.avgPos.toFixed(1)}
                </div>
              </div>
              <div style={{
                background: votoColor + "20", border: `1px solid ${votoColor}40`,
                borderRadius: 8, padding: "6px 14px", textAlign: "center",
              }}>
                <div style={{ color: votoColor, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{r.voto}</div>
                <div style={{ color: C.muted, fontSize: 9, letterSpacing: 1, marginTop: 2 }}>VOTO</div>
              </div>
            </div>
          )
        })}

        <button onClick={() => setPhase("intro")} style={{
          background: "transparent", color: C.muted,
          border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "10px", fontSize: 12, cursor: "pointer",
        }}><AppIcon name="left" size={14} /> Torna alla intro</button>
      </div>
    )
  }

  return null
}