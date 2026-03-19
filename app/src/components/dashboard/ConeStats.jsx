import StatCard from '../shared/StatCard'
import { computeConeStats } from './coneUtils.js'

export default function ConeStats({ attendedEvents }) {
  const {
    totalCones,
    avgConedRunsPerEvent,
    worstEvent,
    worstCones,
    longestStreak,
    currentStreak,
    lastConeRun,
  } = computeConeStats(attendedEvents)

  const lastConeSub = lastConeRun
    ? `Last cone: ${lastConeRun.event.season} E${lastConeRun.event.event_number}`
    : 'No cones on record'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard labelClassName="text-orange-700"
        label="Total Cones"
        value={totalCones}
        sub={`avg ${avgConedRunsPerEvent.toFixed(1)} coned runs / event`}
      />
      <StatCard labelClassName="text-orange-700"
        label="Worst Event"
        value={worstCones > 0 ? `${worstCones} cones` : '—'}
        sub={worstEvent && worstCones > 0 ? `${worstEvent.season} E${worstEvent.event_number}` : null}
      />
      <StatCard labelClassName="text-orange-700"
        label="Longest Clean Streak"
        value={`${longestStreak} runs`}
      />
      <StatCard labelClassName="text-orange-700"
        label="Current Streak"
        value={`${currentStreak} runs`}
        sub={lastConeSub}
      />
    </div>
  )
}
