import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { useSeasonData } from '../hooks/useSeasonData'
import PositionCard from '../components/event/PositionCard'
import PstCard from '../components/event/PstCard'
import RunTimeline from '../components/event/RunTimeline'
import FieldHistogram from '../components/event/FieldHistogram'
import ClassResults from '../components/event/ClassResults'

const RYAN_NAME = 'Ryan Berg'

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const result = useEvent(id)
  const { attendedEvents } = useSeasonData()

  if (!result) {
    return (
      <div className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        Event not found.{' '}
        <Link to="/" style={{ color: 'var(--color-bmw-blue)' }}>Back to season</Link>
      </div>
    )
  }

  const { event } = result
  const ryan = event.ryan

  // Prev/next among attended events only
  const sorted = [...attendedEvents].sort((a, b) => a.event_number - b.event_number)
  const idx = sorted.findIndex(e => e.id === id)
  const prevEvent = idx > 0 ? sorted[idx - 1] : null
  const nextEvent = idx < sorted.length - 1 ? sorted[idx + 1] : null

  const dateStr = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-8">
      {/* Back + Event nav */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="text-xs flex items-center gap-1.5"
          style={{ color: 'var(--color-fg-muted)', textDecoration: 'none' }}
        >
          <span>←</span> Season Overview
        </Link>
        <div className="flex items-center gap-2">
          {prevEvent && (
            <button
              onClick={() => navigate(`/event/${prevEvent.id}`)}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{
                backgroundColor: 'var(--color-surface-3)',
                color: 'var(--color-fg-muted)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              ← E{prevEvent.event_number}
            </button>
          )}
          {nextEvent && (
            <button
              onClick={() => navigate(`/event/${nextEvent.id}`)}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{
                backgroundColor: 'var(--color-surface-3)',
                color: 'var(--color-fg-muted)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              E{nextEvent.event_number} →
            </button>
          )}
        </div>
      </div>

      {/* Event header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-fg)' }}>
            {event.title}
          </h1>
          {event.scoring_type === 'dual_run' && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(28,105,212,0.15)', color: 'var(--color-bmw-blue)', border: '1px solid rgba(28,105,212,0.3)' }}
            >
              Dual Run
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          {dateStr} · Event {event.event_number} · {event.total_drivers_pax} indexed drivers
        </p>
      </div>

      {/* Ryan didn't attend */}
      {!event.ryan_attended || !ryan ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
            Ryan did not attend this event.
          </p>
        </div>
      ) : (
        <>
          {/* Position cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PositionCard
              title="PAX Position"
              rank={ryan.pax_rank}
              total={ryan.pax_total}
              time={ryan.official_indexed_time}
              timeLabel="Indexed time"
              gapSeconds={ryan.pax_gap_seconds}
              gapPct={ryan.pax_gap_pct}
              percentile={ryan.pax_percentile}
            />
            <PositionCard
              title="RAW Position"
              rank={ryan.raw_rank}
              total={ryan.raw_total}
              time={ryan.best_raw_time}
              timeLabel="Best raw time"
              gapSeconds={ryan.raw_gap_seconds}
              gapPct={ryan.raw_gap_pct}
            />
            <PstCard
              indexedTime={ryan.hypothetical_pst_indexed_time}
              pstRank={ryan.hypothetical_pst_rank}
              pstTotal={ryan.hypothetical_pst_total}
              pstPercentile={ryan.hypothetical_pst_percentile}
            />
          </div>

          {/* Runs */}
          <RunTimeline
            runs={ryan.runs}
            scoringType={event.scoring_type}
            bestRawTime={ryan.best_raw_time}
          />

          {/* Histogram + Class results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {event.pax_results.length > 0 && (
              <FieldHistogram
                paxResults={event.pax_results}
                ryanIndexedTime={ryan.official_indexed_time}
              />
            )}
            <ClassResults
              paxResults={event.pax_results}
              classCode={ryan.class_code || 'FS'}
              ryanName={RYAN_NAME}
            />
          </div>
        </>
      )}
    </div>
  )
}
