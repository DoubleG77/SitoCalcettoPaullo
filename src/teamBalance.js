const WEIGHTS = {
  goals: 0.3,
  played: 0.1,
  averageRating: 0.3,
  points: 0.3,
}

function normalize(values) {
  const numericValues = values.map(value => Number.isFinite(value) ? value : 0)
  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)

  if (max === min) return numericValues.map(() => 0)
  return numericValues.map(value => (value - min) / (max - min))
}

export function buildBalancedTeams(players, statsByPlayerId, random = Math.random) {
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
  ranked.sort((a, b) => {
    if (!hasStats) return random() - 0.5
    return b.strength - a.strength
  })

  const teamA = []
  const teamB = []
  ranked.forEach((item, index) => {
    if (index % 2 === 0) teamA.push(item.player)
    else teamB.push(item.player)
  })

  return { teamA, teamB }
}