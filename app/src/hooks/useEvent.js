import { useAllSeasons } from './useAllSeasons'

export function useEvent(id) {
  const { events } = useAllSeasons()
  const event = events.find(e => e.id === id)
  if (!event) return null

  return { event }
}
