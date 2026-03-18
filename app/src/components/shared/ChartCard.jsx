export default function ChartCard({ title, subtitle, children }) {
  return (
    <div className="p-5 flex flex-col gap-4 rounded-lg bg-surface-2 border border-border">
      <div>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {subtitle && (
          <p className="text-xs mt-0.5 text-fg-subtle">{subtitle}</p>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
