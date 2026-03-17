import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SubnavContext } from '../../contexts/SubnavContext'

export default function AppShell({ children }) {
  const location = useLocation()
  const [subnav, setSubnav] = useState(null)

  return (
    <SubnavContext.Provider value={setSubnav}>
      <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--color-surface)' }}>

        {/* Primary navbar */}
        <header
          className="sticky top-0 z-50"
          style={{ backgroundColor: 'var(--color-nav)', borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="max-w-7xl mx-auto px-6 h-12 flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <div
                style={{
                  width: 22, height: 22, borderRadius: 3,
                  background: 'linear-gradient(135deg, var(--color-bmw-blue) 50%, var(--color-bmw-navy) 50%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 8, fontWeight: 700, letterSpacing: '0.05em',
                  flexShrink: 0,
                }}
              >
                AX
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>
                AutoX<span style={{ color: 'var(--color-bmw-blue)' }}>/2025</span>
              </span>
            </Link>

            <div className="flex-1" />

            <nav className="flex items-center">
              <Link
                to="/"
                className="px-3 py-1 text-xs font-medium no-underline"
                style={{
                  color: location.pathname === '/' ? 'var(--color-fg)' : 'var(--color-fg-muted)',
                  borderBottom: location.pathname === '/'
                    ? '2px solid var(--color-bmw-blue)'
                    : '2px solid transparent',
                  paddingBottom: 'calc(0.25rem + 1px)',
                }}
              >
                Season
              </Link>
            </nav>
          </div>
        </header>

        {/* Secondary bar — breadcrumbs / page context */}
        <div
          className="sticky z-40"
          style={{
            top: 48,
            backgroundColor: 'var(--color-subnav)',
            borderBottom: '1px solid var(--color-border)',
            minHeight: 38,
          }}
        >
          <div className="max-w-7xl mx-auto px-6 h-full flex items-center">
            {subnav ?? (
              <span className="text-xs" style={{ color: 'var(--color-fg-subtle)' }}>—</span>
            )}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
          {children}
        </main>

      </div>
    </SubnavContext.Provider>
  )
}
