import season2023 from '../data/season-2023.json'
import season2024 from '../data/season-2024.json'
import season2025 from '../data/season-2025.json'
import season2026 from '../data/season-2026.json'

const ALL_SEASONS = [season2023, season2024, season2025, season2026]

export function useAllSeasons() {
  const events = ALL_SEASONS.flatMap(s =>
    s.events.map(e => ({ ...e, season: s.season }))
  ).sort((a, b) => a.date.localeCompare(b.date))

  const attendedEvents = events.filter(e => e.ryan_attended)

  // Use latest season subject as primary reference
  const subject = ALL_SEASONS[ALL_SEASONS.length - 1].subject

  const years = ALL_SEASONS.map(s => s.season)
  const seasonLabel = `${years[0]}–${years[years.length - 1]}`

  return { events, attendedEvents, subject, season: seasonLabel }
}
