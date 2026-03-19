export default function ChartCard({ title, subtitle, headerRight, children }) {
  return (
    <div className="p-5 flex flex-col gap-4 rounded-lg bg-surface-2 border border-border">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-fg">{title}</h3>
          {subtitle && (
            <p className="text-xs mt-0.5 text-fg-subtle">{subtitle}</p>
          )}
        </div>
        {headerRight}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
