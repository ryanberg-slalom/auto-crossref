export default function ClassResults({ paxResults, classCode, ryanName }) {
  const classDrivers = paxResults
    .filter(d => d.class_code === classCode)
    .sort((a, b) => a.indexed_time - b.indexed_time)

  return (
    <div
      className="overflow-hidden"
      style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}
    >
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ backgroundColor: 'var(--color-surface-3)', borderBottom: '1px solid var(--color-border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>
          {classCode} Class Results
        </h3>
        <span className="text-xs" style={{ color: 'var(--color-fg-subtle)' }}>
          {classDrivers.length} driver{classDrivers.length !== 1 ? 's' : ''}
        </span>
      </div>
      {classDrivers.length === 0 ? (
        <div className="px-5 py-4 text-xs" style={{ color: 'var(--color-fg-subtle)' }}>
          No {classCode} drivers at this event
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              {['#', 'Name', 'Car', 'Raw', 'Indexed'].map(h => (
                <th
                  key={h}
                  className="px-4 py-2 text-left font-medium"
                  style={{ color: 'var(--color-fg-subtle)', backgroundColor: 'var(--color-surface-2)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classDrivers.map((d, i) => {
              const isRyan = d.name === ryanName
              return (
                <tr
                  key={d.name}
                  style={{
                    backgroundColor: isRyan
                      ? 'rgba(28, 105, 212, 0.08)'
                      : i % 2 === 0 ? 'var(--color-surface-2)' : 'transparent',
                    borderBottom: i < classDrivers.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    border: isRyan ? '1px solid rgba(28, 105, 212, 0.2)' : undefined,
                  }}
                >
                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--color-bmw-blue)' }}>
                    {i + 1}
                  </td>
                  <td
                    className="px-4 py-2.5 font-medium"
                    style={{ color: isRyan ? 'var(--color-bmw-blue)' : 'var(--color-fg)' }}
                  >
                    {d.name}
                    {isRyan && <span className="ml-1.5 text-xs opacity-60">(you)</span>}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-fg-muted)' }}>
                    #{d.car_number}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--color-fg)' }}>
                    {d.raw_time}s
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-medium" style={{ color: 'var(--color-fg)' }}>
                    {d.indexed_time}s
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
