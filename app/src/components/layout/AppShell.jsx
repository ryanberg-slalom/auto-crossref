import { Link, useLocation } from 'react-router-dom'

export default function AppShell({ children }) {
  const location = useLocation()
  const isDashboard = location.pathname === '/'

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--color-surface)' }}>
      {/* Top nav */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-surface) 85%, transparent)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
          {/* Logo / wordmark */}
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            {/* BMW roundel-inspired mark */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--color-bmw-blue) 50%, var(--color-bmw-navy) 50%)',
                color: 'white',
                fontSize: '9px',
                letterSpacing: '0.05em',
              }}
            >
              AX
            </div>
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ color: 'var(--color-fg)' }}
            >
              AutoX
              <span style={{ color: 'var(--color-bmw-blue)' }}> / 2025</span>
            </span>
          </Link>

          <div className="flex-1" />

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={{
                color: isDashboard ? 'var(--color-fg)' : 'var(--color-fg-muted)',
                backgroundColor: isDashboard ? 'var(--color-surface-3)' : 'transparent',
              }}
            >
              Season
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  )
}
