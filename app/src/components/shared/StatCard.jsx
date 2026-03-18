export default function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="p-5 flex flex-col gap-1 rounded-lg bg-surface-2 border border-border">
      <span className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </span>
      <span className={`text-3xl font-bold tracking-tight ${accent ? 'text-bmw-blue' : 'text-fg'}`}>
        {value}
      </span>
      {sub && (
        <span className="text-xs text-fg-muted">{sub}</span>
      )}
    </div>
  )
}
