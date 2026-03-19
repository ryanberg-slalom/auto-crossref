export default function StatCard({ label, value, sub, labelClassName }) {
  return (
    <div className="p-5 flex flex-col gap-1 rounded-lg bg-surface-2 border border-border">
      <span className={`text-xs font-extrabold uppercase tracking-wider ${labelClassName ?? 'text-fg-subtle'}`}>
        {label}
      </span>
      <span className={`text-3xl font-bold tracking-tight text-fg`}>
        {value}
      </span>
      {sub && (
        <span className="text-xs text-fg-muted">{sub}</span>
      )}
    </div>
  )
}
