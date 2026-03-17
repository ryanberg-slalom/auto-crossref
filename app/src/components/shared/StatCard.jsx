export default function StatCard({ label, value, sub, accent = false }) {
  return (
    <div
      className="p-5 flex flex-col gap-1"
      style={{ borderRadius: 'var(--radius-lg)' }}
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
      }}
    >
      <span
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: 'var(--color-fg-subtle)' }}
      >
        {label}
      </span>
      <span
        className="text-3xl font-bold tracking-tight"
        style={{ color: accent ? 'var(--color-bmw-blue)' : 'var(--color-fg)' }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}
