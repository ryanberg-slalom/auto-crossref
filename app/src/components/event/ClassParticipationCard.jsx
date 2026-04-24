const CLASS_COLORS = {
  pst: '#8b5cf6',
  fs:  '#1c69d4',
  sst: '#f59e0b',
}

export default function ClassParticipationCard({ paxResults }) {
  const results = paxResults ?? []
  const pstCount = results.filter(d => d.class_code?.toUpperCase().startsWith('PST')).length
  const fsCount  = results.filter(d => d.class_code === 'FS').length
  const sstCount = results.filter(d => d.class_code === 'SST').length

  const classes = [
    { key: 'PST', count: pstCount, color: CLASS_COLORS.pst },
    { key: 'FS',  count: fsCount,  color: CLASS_COLORS.fs  },
    { key: 'SST', count: sstCount, color: CLASS_COLORS.sst },
  ]

  return (
    <div className="p-5 flex flex-col gap-3 rounded-lg bg-surface-2 border border-border">
      <span className="text-xs font-extrabold uppercase tracking-wider text-fg-subtle">
        Class Participation
      </span>

      <div className="flex flex-col gap-2">
        {classes.map(({ key, count, color }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: color }} />
            <span className="text-xs font-semibold text-fg-muted w-8 shrink-0">{key}</span>
            <span className="text-2xl font-bold tracking-tight text-fg tabular-nums">{count}</span>
            <span className="text-xs text-fg-muted">{count === 1 ? 'driver' : 'drivers'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
