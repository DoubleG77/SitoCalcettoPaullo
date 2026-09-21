export function getTodayDateInput() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getMatchDateValue(match) {
  return match.date
    ? new Date(`${match.date}T12:00:00`)
    : new Date(match.created_at)
}

export function formatMatchDate(match, options) {
  return getMatchDateValue(match).toLocaleDateString("it-IT", options)
}