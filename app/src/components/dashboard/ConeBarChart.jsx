import { useNavigate } from 'react-router-dom'
import ChartCard from '../shared/ChartCard'
import { linReg, TrendBadge } from './chartUtils.jsx'
import { coneChartData } from './coneUtils.js'
import { pluralize } from '../../utils/pluralize.js'

const CONE_ICON = `${import.meta.env.BASE_URL}cone.svg`
const CONE_W = 16    // px — width of each cone icon
const MAX_CONE_H = 28 // px — max height per cone; scales down if many cones
const CHART_H = 160  // px — fixed chart area height

export default function ConeBarChart({ data }) {
  const navigate = useNavigate()
  const base = coneChartData(data)
  if (base.length === 0) return null

  const overallReg = linReg(base.map(d => ({ x: d.i, y: d.totalCones })))
  const slope = overallReg?.slope ?? null
  const maxCones = Math.max(...base.map(d => d.totalCones), 1)
  const coneH = Math.min(MAX_CONE_H, Math.floor(CHART_H / maxCones))

  return (
    <ChartCard
      title="Cones per Event"
      subtitle="Total cones hit — lower is better"
      headerRight={<TrendBadge slope={slope} positiveIsGood={false} decimals={2} />}
    >
      <div className="flex items-end gap-0.5">
        {base.map(d => (
          <EventColumn
            key={d.id}
            d={d}
            coneH={coneH}
            onClick={() => navigate(`/event/${d.id}`)}
          />
        ))}
      </div>
    </ChartCard>
  )
}

function EventColumn({ d, coneH, onClick }) {
  return (
    <div
      className="relative flex flex-col items-center cursor-pointer group"
      style={{ flex: 1, minWidth: CONE_W + 4 }}
      onClick={onClick}
    >
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1.5 text-xs rounded bg-surface-2 border border-border shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-100">
        <div className="font-semibold text-fg mb-0.5">{d.label}</div>
        <div className="text-fg-muted">
          Cones: <span className="text-fg font-semibold">{d.totalCones}</span>
        </div>
        <div className="text-fg-muted">
          {pluralize(d.conedRuns, 'coned run')} of {d.totalRuns}
        </div>
      </div>

      {/* Cone stack — flex-col-reverse so first cone sits at the bottom */}
      <div
        className="flex flex-col-reverse items-center justify-start"
        style={{ height: CHART_H }}
      >
        {d.totalCones === 0
          ? <div className="w-3 h-px bg-border rounded" />
          : Array.from({ length: d.totalCones }).map((_, i) => (
              <img
                key={i}
                src={CONE_ICON}
                alt="cone"
                style={{ width: CONE_W, height: coneH }}
                className="object-contain"
              />
            ))
        }
      </div>

      {/* X-axis label */}
      <div className="text-[10px] text-fg-subtle mt-1.5 tabular-nums leading-none">
        {d.tick}
      </div>
    </div>
  )
}
