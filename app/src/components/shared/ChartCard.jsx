export default function ChartCard({ title, subtitle, children }) {
  return (
    <div
      className="p-5 flex flex-col gap-4"
      style={{ borderRadius: 'var(--radius-lg)' }}
      style={{
        backgroundColor: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-subtle)' }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
