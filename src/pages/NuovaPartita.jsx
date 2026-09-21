import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../authContext"
import { getTodayDateInput } from "../matchDate"
import { buildBalancedTeams } from "../teamBalance"

const C = {
  bg: "#07131b",
  surface: "#0d1f2c",
  card: "#12263a",
  border: "rgba(148, 163, 184, 0.16)",
  accent: "#71f0b0",
  red: "#ff7c8b",
  text: "#edf6ff",
  muted: "#9bb2c6",
}

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "linear-gradient(180deg, rgba(18,38,58,0.96), rgba(13,24,34,0.92))",
    border: `1px solid ${C.border}`,
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 10px 24px rgba(2, 6, 10, 0.16)",
    ...style
  }}>
    {children}
  </div>
)

const Label = ({ children }) => (
  <div style={{
    color: C.muted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 800,
    marginBottom: 12,
    textTransform: "uppercase",
  }}>
    {children}
  </div>
)

export default function NuovaPartita() {
  const [players, setPlayers] = useState([])
  const [teamA, setTeamA] = useState([])
  const [teamB, setTeamB] = useState([])
  const [nameA, setNameA] = useState("")
  const [nameB, setNameB] = useState("")
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [goalsA, setGoalsA] = useState({})
  const [goalsB, setGoalsB] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [playerSearch, setPlayerSearch] = useState("")
  const [saveError, setSaveError] = useState("")
  const [matchDate, setMatchDate] = useState(getTodayDateInput())
  const [balancing, setBalancing] = useState(false)
  const [balanceError, setBalanceError] = useState("")

  useEffect(() => {
    supabase.from("players").select("*").order("name").then(({ data }) => {
      if (data) setPlayers(data)
    })
  }, [])

  const { player } = useAuth()

  const togglePlayer = (player) => {
    if (teamA.find(p => p.id === player.id)) {
      setTeamA(teamA.filter(p => p.id !== player.id))
      setGoalsA(g => { const n = {...g}; delete n[player.id]; return n })
      return
    }
    if (teamB.find(p => p.id === player.id)) {
      setTeamB(teamB.filter(p => p.id !== player.id))
      setGoalsB(g => { const n = {...g}; delete n[player.id]; return n })
      return
    }
    if (teamA.length < 6) setTeamA([...teamA, player])
    else if (teamB.length < 6) setTeamB([...teamB, player])
  }

  const totalGoalsA = Object.values(goalsA).reduce((s, v) => s + v, 0)
  const totalGoalsB = Object.values(goalsB).reduce((s, v) => s + v, 0)
  const canSave = teamA.length === 6 && teamB.length === 6
    && totalGoalsA === scoreA && totalGoalsB === scoreB

  const generateBalancedTeams = async () => {
    const selectedPlayers = [...teamA, ...teamB]
    if (selectedPlayers.length !== 12) {
      setBalanceError("Seleziona esattamente 12 giocatori per generare le squadre.")
      return
    }

    setBalancing(true)
    setBalanceError("")

    const [{ data: matches }, { data: matchPlayers }, { data: goals }, { data: ratings }] = await Promise.all([
      supabase.from("matches").select("id, score_a, score_b"),
      supabase.from("match_players").select("match_id, player_id, team"),
      supabase.from("goals").select("match_id, player_id, count"),
      supabase.from("ratings").select("match_id, candidate_id, position"),
    ])

    if (!matches || !matchPlayers || !goals || !ratings) {
      setBalanceError("Non riesco a recuperare le statistiche dei giocatori.")
      setBalancing(false)
      return
    }

    const statsByPlayerId = {}
    selectedPlayers.forEach(player => {
      statsByPlayerId[player.id] = { goals: 0, played: 0, points: 0, ratingSum: 0, ratingCount: 0 }
    })

    matchPlayers.forEach(matchPlayer => {
      const stats = statsByPlayerId[matchPlayer.player_id]
      const match = matches.find(item => item.id === matchPlayer.match_id)
      if (!stats || !match) return

      stats.played += 1
      const ownScore = matchPlayer.team === "A" ? match.score_a : match.score_b
      const opponentScore = matchPlayer.team === "A" ? match.score_b : match.score_a
      if (ownScore > opponentScore) stats.points += 3
      if (ownScore === opponentScore) stats.points += 1
    })

    goals.forEach(goal => {
      if (statsByPlayerId[goal.player_id]) statsByPlayerId[goal.player_id].goals += goal.count || 0
    })

    const ratingsByMatch = {}
    ratings.forEach(rating => {
      if (!ratingsByMatch[rating.match_id]) ratingsByMatch[rating.match_id] = []
      ratingsByMatch[rating.match_id].push(rating)
    })

    Object.values(ratingsByMatch).forEach(matchRatings => {
      const positions = matchRatings.map(rating => rating.position)
      const min = Math.min(...positions)
      const max = Math.max(...positions)
      matchRatings.forEach(rating => {
        const stats = statsByPlayerId[rating.candidate_id]
        if (!stats) return
        const ratingValue = max === min ? 6 : 9 - ((rating.position - min) / (max - min)) * 3
        stats.ratingSum += ratingValue
        stats.ratingCount += 1
      })
    })

    Object.values(statsByPlayerId).forEach(stats => {
      stats.averageRating = stats.ratingCount > 0 ? stats.ratingSum / stats.ratingCount : 0
    })

    const { teamA: generatedA, teamB: generatedB } = buildBalancedTeams(selectedPlayers, statsByPlayerId)
    setTeamA(generatedA)
    setTeamB(generatedB)
    setGoalsA({})
    setGoalsB({})
    setBalancing(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError("")
    try {
      const { data: match, error } = await supabase
        .from("matches")
        .insert({
          team_a_name: nameA || "Squadra A",
          team_b_name: nameB || "Squadra B",
          score_a: scoreA,
          score_b: scoreB,
          date: matchDate,
          created_by: player?.id,
        })
        .select().maybeSingle()
      if (error) throw error

      const { error: playersError } = await supabase.from("match_players").insert([
        ...teamA.map(p => ({ match_id: match.id, player_id: p.id, team: "A" })),
        ...teamB.map(p => ({ match_id: match.id, player_id: p.id, team: "B" })),
      ])
      if (playersError) throw playersError

      const goalRows = [
        ...Object.entries(goalsA).filter(([, v]) => v > 0).map(([id, count]) => ({ match_id: match.id, player_id: id, count })),
        ...Object.entries(goalsB).filter(([, v]) => v > 0).map(([id, count]) => ({ match_id: match.id, player_id: id, count })),
      ]
      if (goalRows.length > 0) {
        const { error: goalsError } = await supabase.from("goals").insert(goalRows)
        if (goalsError) throw goalsError
      }

      setSuccess(true)
      setTeamA([]); setTeamB([]); setNameA(""); setNameB("")
      setScoreA(0); setScoreB(0); setGoalsA({}); setGoalsB({})
      setMatchDate(getTodayDateInput())
    } catch (e) {
      setSaveError(`Errore nel salvataggio: ${e.message}`)
    }
    setSaving(false)
  }

  const clearTeams = () => {
    setTeamA([])
    setTeamB([])
    setGoalsA({})
    setGoalsB({})
  }

  const visiblePlayers = players.filter(p =>
    p.name.toLowerCase().includes(playerSearch.trim().toLowerCase())
  )

  if (success) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 60, textAlign: "center" }}>
      <div style={{ fontSize: 56 }}>✅</div>
      <div style={{ color: C.text, fontSize: 22, fontWeight: 900 }}>Partita salvata!</div>
      <button onClick={() => setSuccess(false)} style={{
        background: C.accent,
        color: C.bg,
        border: "none",
        borderRadius: 14,
        padding: "14px 32px",
        fontWeight: 900,
        fontSize: 15,
        cursor: "pointer",
        marginTop: 8,
        boxShadow: "0 12px 24px rgba(113, 240, 176, 0.24)",
      }}>INSERISCI UN'ALTRA</button>
    </div>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ color: C.muted, fontSize: 10, letterSpacing: 2.5, fontWeight: 800 }}>NUOVA PARTITA</div>
          <div style={{ color: C.text, fontSize: 26, fontWeight: 900, marginTop: 4 }}>Inserisci match</div>
        </div>
        <div style={{
          background: "rgba(113, 240, 176, 0.08)",
          border: "1px solid rgba(113, 240, 176, 0.2)",
          color: C.accent,
          borderRadius: 999,
          padding: "7px 10px",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}>
          {teamA.length + teamB.length}/12 giocatori
        </div>
      </div>

      <Card>
        <Label>Data partita</Label>
        <input
          type="date"
          value={matchDate}
          onChange={e => setMatchDate(e.target.value)}
          required
          aria-label="Data della partita"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: C.surface,
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "11px 12px",
            fontSize: 14,
            outline: "none",
          }}
        />
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <Label>Giocatori</Label>
          {(teamA.length > 0 || teamB.length > 0) && (
            <button onClick={clearTeams} style={{
              background: "transparent",
              border: "none",
              color: C.muted,
              padding: 0,
              fontSize: 11,
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 700,
            }}>Svuota</button>
          )}
        </div>

        {players.length === 0 && (
          <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>Nessun giocatore nel database</div>
        )}

        {players.length > 0 && (
          <input
            value={playerSearch}
            onChange={e => setPlayerSearch(e.target.value)}
            placeholder="Cerca giocatore..."
            aria-label="Cerca giocatore"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: C.surface,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 13,
              outline: "none",
              marginBottom: 12,
            }}
          />
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {visiblePlayers.map(p => {
            const inA = teamA.find(x => x.id === p.id)
            const inB = teamB.find(x => x.id === p.id)
            return (
              <button key={p.id} onClick={() => togglePlayer(p)} style={{
                padding: "7px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid",
                background: inA ? "rgba(113, 240, 176, 0.12)" : inB ? "rgba(255, 124, 139, 0.12)" : "rgba(15, 23, 30, 0.7)",
                borderColor: inA ? C.accent : inB ? C.red : C.border,
                color: inA ? C.accent : inB ? C.red : C.muted,
                transition: "all 0.15s ease",
              }}>{p.name}</button>
            )
          })}
          {players.length > 0 && visiblePlayers.length === 0 && (
            <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>Nessun giocatore trovato</div>
          )}
        </div>

        <button
          onClick={generateBalancedTeams}
          disabled={balancing || teamA.length + teamB.length !== 12}
          style={{
            width: "100%",
            background: teamA.length + teamB.length === 12 ? "rgba(113, 240, 176, 0.12)" : "rgba(148, 163, 184, 0.08)",
            color: teamA.length + teamB.length === 12 ? C.accent : C.muted,
            border: `1px solid ${teamA.length + teamB.length === 12 ? C.accent : C.border}50`,
            borderRadius: 12,
            padding: "11px 14px",
            fontWeight: 800,
            fontSize: 13,
            cursor: balancing || teamA.length + teamB.length !== 12 ? "not-allowed" : "pointer",
            marginBottom: 16,
          }}
        >
          {balancing ? "CALCOLO SQUADRE..." : "GENERA SQUADRE BILANCIATE"}
        </button>

        {balanceError && (
          <div role="alert" style={{ color: C.red, fontSize: 12, marginBottom: 16 }}>
            {balanceError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { team: teamA, name: nameA, setName: setNameA, color: C.accent, label: "A" },
            { team: teamB, name: nameB, setName: setNameB, color: C.red, label: "B" },
          ].map(({ team, name, setName, color, label }) => (
            <div key={label} style={{
              background: C.surface,
              borderRadius: 14,
              padding: 12,
              border: `1px solid ${color}30`,
            }}>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder={`Nome squadra ${label}`}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  borderBottom: `1px solid ${color}50`,
                  width: "100%",
                  color,
                  fontSize: 13,
                  fontWeight: 800,
                  paddingBottom: 6,
                  marginBottom: 10,
                }} />
              <div style={{ color, fontSize: 10, letterSpacing: 1, fontWeight: 800, marginBottom: 8 }}>
                SQUADRA {label} ({team.length}/6)
              </div>
              {team.length === 0
                ? <div style={{ color: C.muted, fontSize: 12, fontStyle: "italic" }}>Nessuno</div>
                : team.map(p => (
                  <div key={p.id} style={{ color: C.text, fontSize: 13, padding: "2px 0" }}>· {p.name}</div>
                ))
              }
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Label>Risultato</Label>
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          {[
            { name: nameA || "Squadra A", val: scoreA, set: setScoreA, color: C.accent },
            { name: nameB || "Squadra B", val: scoreB, set: setScoreB, color: C.red },
          ].map(({ name, val, set, color }, i) => (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ color, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>{name}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <button onClick={() => set(Math.max(0, val - 1))} style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontSize: 20,
                  cursor: "pointer",
                }}>−</button>
                <span style={{ color, fontSize: 46, fontWeight: 900, width: 56, textAlign: "center", lineHeight: 1 }}>{val}</span>
                <button onClick={() => set(val + 1)} style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontSize: 20,
                  cursor: "pointer",
                }}>+</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {(teamA.length > 0 || teamB.length > 0) && (scoreA > 0 || scoreB > 0) && (
        <Card>
          <Label>Marcatori</Label>
          {[
            { team: teamA, score: scoreA, goals: goalsA, setGoals: setGoalsA, color: C.accent, name: nameA || "Squadra A", total: totalGoalsA },
            { team: teamB, score: scoreB, goals: goalsB, setGoals: setGoalsB, color: C.red, name: nameB || "Squadra B", total: totalGoalsB },
          ].map(({ team, score, goals, setGoals, color, name, total }) => (
            score > 0 && team.length > 0 && (
              <div key={name} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>{name}</span>
                  <span style={{ fontSize: 12, color: total === score ? C.accent : total > score ? C.red : C.muted }}>
                    {total}/{score} gol {total === score ? "✓" : total > score ? "⚠" : ""}
                  </span>
                </div>
                {team.map(p => (
                  <div key={p.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: color + "20",
                      border: `1px solid ${color}40`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      fontSize: 12,
                      fontWeight: 900,
                    }}>{p.name[0]}</div>
                    <span style={{ color: C.text, fontSize: 14, flex: 1 }}>{p.name}</span>
                    <select
                      value={goals[p.id] || 0}
                      onChange={e => setGoals(g => ({ ...g, [p.id]: parseInt(e.target.value) }))}
                      style={{
                        background: C.surface,
                        color: C.text,
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        padding: "6px 10px",
                        fontSize: 14,
                        cursor: "pointer",
                        outline: "none",
                        minWidth: 64,
                      }}>
                      {Array.from({ length: score + 1 }, (_, i) => (
                        <option key={i} value={i}>{i === 0 ? "–" : `⚽ ${i}`}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )
          ))}
        </Card>
      )}

      {saveError && (
        <div role="alert" style={{
          background: C.red + "15",
          border: `1px solid ${C.red}40`,
          borderRadius: 12,
          color: C.red,
          padding: "11px 13px",
          fontSize: 13,
        }}>{saveError}</div>
      )}

      <button onClick={handleSave} disabled={!canSave || saving} style={{
        background: canSave ? C.accent : C.border,
        color: canSave ? C.bg : C.muted,
        border: "none",
        borderRadius: 14,
        padding: "15px",
        fontWeight: 900,
        fontSize: 15,
        letterSpacing: 1,
        cursor: canSave ? "pointer" : "not-allowed",
        boxShadow: canSave ? "0 12px 24px rgba(113, 240, 176, 0.22)" : "none",
      }}>
        {saving ? "SALVATAGGIO..." : "SALVA PARTITA ✓"}
      </button>
    </div>
  )
}