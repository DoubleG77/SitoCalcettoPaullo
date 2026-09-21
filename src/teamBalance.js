const WEIGHTS = {
  goals: 0.3,
  played: 0.1,
  averageRating: 0.3,
  points: 0.3,
}

const HISTORY_WEIGHTS = {
  balance: 5,
  chemistry: 0.35,
  repetition: 0.04,
}

function normalize(values) {
  const numericValues = values.map(value => Number.isFinite(value) ? value : 0)
  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)

  if (max === min) return numericValues.map(() => 0)
  return numericValues.map(value => (value - min) / (max - min))
}

function getPairKey(firstId, secondId) {
  return [String(firstId), String(secondId)].sort().join(":")
}

function getPairChemistry(firstId, secondId, pairHistory) {
  const history = pairHistory[getPairKey(firstId, secondId)]
  if (!history || history.matches === 0) return { chemistry: 0, repetition: 0 }

  const pointsPerMatch = history.points / history.matches
  const goalDifferencePerMatch = history.goalDifference / history.matches
  return {
    chemistry: pointsPerMatch / 3 + Math.max(-1, Math.min(1, goalDifferencePerMatch / 5)),
    repetition: history.matches,
  }
}

function getTeamHistoryScore(team, pairHistory) {
  let chemistry = 0
  let repetition = 0

  for (let first = 0; first < team.length; first += 1) {
    for (let second = first + 1; second < team.length; second += 1) {
      const pair = getPairChemistry(team[first].id, team[second].id, pairHistory)
      chemistry += pair.chemistry
      repetition += pair.repetition
    }
  }

  return { chemistry, repetition }
}

function getCombinations(items, size, start = 0, current = [], combinations = []) {
  if (current.length === size) {
    combinations.push([...current])
    return combinations
  }

  for (let index = start; index <= items.length - (size - current.length); index += 1) {
    current.push(items[index])
    getCombinations(items, size, index + 1, current, combinations)
    current.pop()
  }

  return combinations
}

export function buildBalancedTeams(players, statsByPlayerId, pairHistory = {}, random = Math.random) {
  if (players.length !== 12) return { teamA: [], teamB: [] }

  const stats = players.map(player => ({
    player,
    goals: statsByPlayerId[player.id]?.goals || 0,
    played: statsByPlayerId[player.id]?.played || 0,
    averageRating: statsByPlayerId[player.id]?.averageRating || 0,
    points: statsByPlayerId[player.id]?.points || 0,
  }))

  const normalized = {
    goals: normalize(stats.map(item => item.goals)),
    played: normalize(stats.map(item => item.played)),
    averageRating: normalize(stats.map(item => item.averageRating)),
    points: normalize(stats.map(item => item.points)),
  }

  const ranked = stats.map((item, index) => ({
    ...item,
    strength: normalized.goals[index] * WEIGHTS.goals
      + normalized.played[index] * WEIGHTS.played
      + normalized.averageRating[index] * WEIGHTS.averageRating
      + normalized.points[index] * WEIGHTS.points,
  }))

  const hasStats = ranked.some(item => item.strength > 0)
  if (!hasStats && Object.keys(pairHistory).length === 0) {
    ranked.sort(() => random() - 0.5)
    return {
      teamA: ranked.slice(0, 6).map(item => item.player),
      teamB: ranked.slice(6).map(item => item.player),
    }
  }

  const strengthTotal = ranked.reduce((sum, item) => sum + item.strength, 0)
  const targetStrength = strengthTotal / 2
  const rankedById = Object.fromEntries(ranked.map(item => [item.player.id, item]))
  const candidates = getCombinations(ranked.map(item => item.player), 6)
  let best = null

  candidates.forEach(teamA => {
    // A division and its inverse are equivalent: fixing the first player avoids duplicate work.
    if (teamA.some(player => player.id === ranked[0].player.id) === false) return

    const teamAIds = new Set(teamA.map(player => player.id))
    const teamB = ranked
      .filter(item => !teamAIds.has(item.player.id))
      .map(item => item.player)
    const strengthA = teamA.reduce((sum, player) => sum + rankedById[player.id].strength, 0)
    const strengthB = strengthTotal - strengthA
    const teamAHistory = getTeamHistoryScore(teamA, pairHistory)
    const teamBHistory = getTeamHistoryScore(teamB, pairHistory)
    const chemistry = teamAHistory.chemistry + teamBHistory.chemistry
    const repetition = teamAHistory.repetition + teamBHistory.repetition
    const score = HISTORY_WEIGHTS.balance * (targetStrength - Math.abs(strengthA - targetStrength))
      + HISTORY_WEIGHTS.chemistry * chemistry
      - HISTORY_WEIGHTS.repetition * repetition

    if (!best || score > best.score) {
      best = { teamA, teamB, score, strengthA, strengthB, chemistry, repetition }
    }
  })

  return {
    teamA: best.teamA,
    teamB: best.teamB,
    summary: {
      strengthA: best.strengthA,
      strengthB: best.strengthB,
      chemistry: best.chemistry,
      repeatedPairs: best.repetition,
    },
  }
}