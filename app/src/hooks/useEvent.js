import seasonData from '../data/season-2025.json'

export function useEvent(id) {
  const event = seasonData.events.find(e => e.id === id)
  if (!event) return null

  const allEvents = seasonData.events
  const idx = allEvents.indexOf(event)
  const prevEvent = idx > 0 ? allEvents[idx - 1] : null
  const nextEvent = idx < allEvents.length - 1 ? allEvents[idx + 1] : null

  return { event, prevEvent, nextEvent }
}
