import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HomeIcon, CalendarDaysIcon, UserGroupIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { SubnavContext } from '../../contexts/SubnavContext'
import { useSeasonData } from '../../hooks/useSeasonData'
import { venueBgClass } from '../shared/venueColors'

const VENUE_LABEL = { michelin: 'Michelin', zmax: 'ZMAX' }

function EventNavItem({ event }) {
  const location = useLocation()
  const active = location.pathname === `/event/${event.id}`

  const dateStr = new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })

  if (!event.ryan_attended) {
    return (
      <div className="flex items-center gap-1 pl-4 pr-3 py-[5px] rounded text-xs text-fg-subtle opacity-40 cursor-default select-none">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${venueBgClass(event.venue)}`} />
        <span className="pl-2 font-semibold shrink-0">{VENUE_LABEL[event.venue]}</span>
        <span className="font-bold shrink-0">#{event.event_number}</span>
        <span className="pl-2 truncate">{dateStr}</span>
      </div>
    )
  }

  return (
    <Link
      to={`/event/${event.id}`}
      className={[
        'flex items-center gap-1 pl-4 pr-3 py-[5px] rounded text-xs no-underline',
        active
          ? 'bg-orange-100/60 text-orange-700 font-medium'
          : 'text-fg hover:bg-surface-3',
      ].join(' ')}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${venueBgClass(event.venue)}`} />
      <span className="pl-2 font-semibold shrink-0">{VENUE_LABEL[event.venue]}</span>
      <span className="font-bold shrink-0">#{event.event_number}</span>
      <span className={['pl-2 truncate', active ? 'opacity-70' : 'text-fg-muted'].join(' ')}>
        {dateStr}
      </span>
    </Link>
  )
}

export default function AppShell({ children }) {
  const location = useLocation()
  const [subnav, setSubnav] = useState(null)
  const { events } = useSeasonData()

  // Group events by season year, most recent first
  const eventsByYear = {}
  events.forEach(event => {
    const year = event.season ?? 2025
    if (!eventsByYear[year]) eventsByYear[year] = []
    eventsByYear[year].push(event)
  })
  const yearGroups = Object.entries(eventsByYear)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, evts]) => ({
      year: Number(year),
      events: [...evts].sort((a, b) => b.event_number - a.event_number),
    }))

  return (
    <SubnavContext.Provider value={setSubnav}>
      <div className="min-h-dvh flex flex-col bg-surface">

        {/* Full-width primary navbar */}
        <header className="sticky top-0 z-50 flex h-12 bg-nav border-b border-border">
          {/* Brand area — same width as sidebar */}
          <Link to="/" className="w-60 shrink-0 flex items-center gap-2 px-4 border-r border-border no-underline">
            <svg viewBox="0 0 22 22" width="22" height="22" className="shrink-0" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <clipPath id="logo-shape">
                  <rect width="22" height="22" rx="3"/>
                </clipPath>
                <clipPath id="cone-logo">
                  <polygon points="11,2 4.5,19.5 17.5,19.5"/>
                </clipPath>
              </defs>
              <g clipPath="url(#logo-shape)">
                <rect width="22" height="22" fill="#3a3f4a"/>
                <polygon points="11,2 4.5,19.5 17.5,19.5" fill="#f97316"/>
                <polygon points="11,2 14.5,10 15.7,13 17.5,19.5" fill="#000" opacity="0.1"/>
                <g clipPath="url(#cone-logo)">
                  <line x1="-5" y1="-7.5" x2="27" y2="34.5" stroke="white" strokeWidth="3" strokeLinecap="butt" opacity="0.88"/>
                  <line x1="27" y1="-7.5" x2="-5" y2="34.5" stroke="white" strokeWidth="3" strokeLinecap="butt" opacity="0.88"/>
                </g>
                <rect x="0" y="19.5" width="22" height="2.5" fill="#c2550a"/>
              </g>
            </svg>
            <span className="text-sm font-black text-fg tracking-tight">
              Auto <span className="text-orange-700">Crossref</span>
            </span>
          </Link>
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
                  ? 'bg-orange-100/60 text-orange-700'
                  : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
              ].join(' ')}
            >
              <HomeIcon className="w-4 h-4 shrink-0" />
              Dashboard
            </Link>

            {/* Events section — grouped by year */}
            {yearGroups.map(({ year, events: yearEvents }) => (
              <div key={year} className="mt-3">
                <div className="flex items-center gap-2 px-3 py-1 mb-0.5">
                  <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0 text-fg-subtle" />
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                    {year}
                  </span>
                </div>
                <div className="flex flex-col gap-px">
                  {yearEvents.map(event => (
                    <EventNavItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}

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
