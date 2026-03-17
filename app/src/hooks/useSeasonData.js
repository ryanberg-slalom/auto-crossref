import seasonData from '../data/season-2025.json'

export function useSeasonData() {
  const events = seasonData.events
  const subject = seasonData.subject
  const attendedEvents = events.filter(e => e.ryan_attended)

  return { events, subject, attendedEvents, season: seasonData.season }
}
