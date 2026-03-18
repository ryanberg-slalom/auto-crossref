import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HomeIcon, CalendarDaysIcon, UserGroupIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { SubnavContext } from '../../contexts/SubnavContext'
import { useSeasonData } from '../../hooks/useSeasonData'
import { venueColor } from '../shared/venueColors'

const VENUE_LABEL = { michelin: 'Michelin', zmax: 'ZMAX' }

function EventNavItem({ event }) {
  const location = useLocation()
  const active = location.pathname === `/event/${event.id}`

  const dateStr = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })

  if (!event.ryan_attended) {
    return (
      <div className="flex items-center gap-2 px-3 py-[5px] rounded text-[11px] text-fg-subtle opacity-40 cursor-default select-none">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: venueColor(event.venue) }}
        />
        <span className="font-medium shrink-0">#{event.event_number}</span>
        <span className="truncate">{dateStr} · {VENUE_LABEL[event.venue]}</span>
      </div>
    )
  }

  return (
    <Link
      to={`/event/${event.id}`}
      className={[
        'flex items-center gap-2 px-3 py-[5px] rounded text-[11px] no-underline',
        active
          ? 'bg-bmw-blue/10 text-bmw-blue font-medium'
          : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
      ].join(' ')}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: venueColor(event.venue) }}
      />
      <span className="font-medium shrink-0">#{event.event_number}</span>
      <span className={['truncate', active ? 'opacity-70' : 'text-fg-subtle'].join(' ')}>
        {dateStr} · {VENUE_LABEL[event.venue]}
      </span>
    </Link>
  )
}

export default function AppShell({ children }) {
  const location = useLocation()
  const [subnav, setSubnav] = useState(null)
  const { events } = useSeasonData()

  const sortedEvents = [...events].sort((a, b) => a.event_number - b.event_number)

  return (
    <SubnavContext.Provider value={setSubnav}>
      <div className="min-h-dvh flex flex-col bg-surface">

        {/* Full-width primary navbar */}
        <header className="sticky top-0 z-50 flex h-12 bg-nav border-b border-border">
          {/* Brand area — same width as sidebar */}
          <div className="w-60 shrink-0 flex items-center gap-2.5 px-4 border-r border-border">
            <div className="w-[22px] h-[22px] rounded-[3px] flex items-center justify-center text-white text-[8px] font-bold tracking-[0.05em] shrink-0 bg-[linear-gradient(135deg,var(--color-bmw-blue)_50%,var(--color-bmw-navy)_50%)]">
              AX
            </div>
            <span className="text-sm font-black text-fg tracking-tight">
              Auto <span className="text-bmw-blue">Crossref</span>
            </span>
          </div>
          {/* Navbar content — injected by pages */}
          <div className="flex-1 flex items-center min-w-0 px-5 [box-shadow:0_4px_12px_0_rgba(0,0,0,0.06)] [clip-path:inset(0px_0px_-20px_0px)]">
            {subnav}
          </div>
        </header>

        {/* Below header: sidebar + main content */}
        <div className="flex flex-1">

          {/* Sidebar */}
          <aside className="w-60 shrink-0 sticky top-12 h-[calc(100dvh-3rem)] overflow-y-auto bg-nav border-r border-border flex flex-col py-3 px-2">

            {/* Club selector */}
            <div className="relative mb-3">
              <select
                defaultValue="ccr-scca"
                className="w-full appearance-none bg-surface border border-border rounded px-3 py-[7px] text-xs font-medium text-fg pr-7 cursor-pointer focus:outline-none focus:border-bmw-blue/50"
              >
                <option value="ccr-scca">CCR-SCCA</option>
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-muted pointer-events-none" />
            </div>

            {/* Dashboard */}
            <Link
              to="/"
              className={[
                'flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium no-underline',
                location.pathname === '/'
                  ? 'bg-bmw-blue/10 text-bmw-blue'
                  : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
              ].join(' ')}
            >
              <HomeIcon className="w-4 h-4 shrink-0" />
              Dashboard
            </Link>

            {/* Events section */}
            <div className="mt-3">
              <div className="flex items-center gap-2 px-3 py-1 mb-0.5">
                <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0 text-fg-subtle" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                  Events
                </span>
              </div>
              <div className="flex flex-col gap-px">
                {sortedEvents.map(event => (
                  <EventNavItem key={event.id} event={event} />
                ))}
              </div>
            </div>

            {/* Competitors */}
            <div className="mt-3">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium text-fg-muted opacity-40 cursor-not-allowed select-none">
                <UserGroupIcon className="w-4 h-4 shrink-0" />
                Competitors
                <span className="ml-auto text-[9px] font-medium uppercase tracking-wider border border-border rounded px-1 py-px text-fg-subtle">
                  soon
                </span>
              </div>
            </div>

          </aside>

          {/* Main content column */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* Page content */}
            <main className="flex-1 px-6 py-6">
              {children}
            </main>

          </div>
        </div>

      </div>
    </SubnavContext.Provider>
  )
}
