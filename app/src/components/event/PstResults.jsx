import { useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import DataTable from '../shared/DataTable'

const RYAN_NAME = 'Ryan Berg'

const helper = createColumnHelper()

function fmt(n) {
  return Number(n).toFixed(3)
}

function DeltaCell({ value, ryanValue, isRyan }) {
  if (isRyan) {
    return <span className="font-mono">{fmt(value)}s</span>
  }
  const delta = value - ryanValue
  const sign = delta > 0 ? '+' : ''
  return (
    <span className="font-mono">
      {fmt(value)}s <span className="font-bold">({sign}{fmt(delta)})</span>
    </span>
  )
}

export default function PstResults({ paxResults, ryan, ryanCar, ryanName = RYAN_NAME }) {
  const { rows, ryanRaw, ryanPax } = useMemo(() => {
    const pst = paxResults.filter(d => d.class_code?.startsWith('PST'))

    const ryanRaw = ryan.best_raw_time
    const ryanPax = ryan.hypothetical_pst_indexed_time ?? ryan.official_indexed_time

    const rr = {
      name: ryanName,
      class_code: 'FS (hyp.)',
      car: ryanCar ?? '',
      pax_index: ryan.pax_index,
      raw_time: ryanRaw,
      indexed_time: ryanPax,
      _isRyan: true,
    }

    const combined = [...pst, rr].sort((a, b) => a.indexed_time - b.indexed_time)
    return { rows: combined, ryanRaw, ryanPax }
  }, [paxResults, ryan, ryanCar, ryanName])

  const columns = useMemo(() => [
    helper.accessor((row, i) => i + 1, {
      id: 'pos',
      header: '#',
      meta: { thClassName: 'text-right', tdClassName: 'text-right' },
      cell: info => (
        <span className="font-mono font-semibold text-bmw-blue">
          {info.getValue()}
        </span>
      ),
    }),
    helper.accessor('name', {
      header: 'Name',
      cell: info => {
        const isRyan = info.row.original._isRyan
        return (
          <span className={isRyan ? 'text-bmw-blue font-semibold' : 'text-fg'}>
            {info.getValue()}
            {isRyan && <span className="ml-1.5 text-[10px] opacity-60">(you)</span>}
          </span>
        )
      },
    }),
    helper.accessor('class_code', {
      header: 'Class',
      cell: info => (
        <span className="text-fg-muted text-[11px]">{info.getValue()}</span>
      ),
    }),
    helper.accessor('car', {
      header: 'Car',
      cell: info => (
        <span className="text-fg-muted">{info.getValue() || '—'}</span>
      ),
    }),
    helper.accessor('raw_time', {
      header: 'Raw',
      meta: { thClassName: 'text-right', tdClassName: 'text-right' },
      cell: info => (
        <DeltaCell
          value={info.getValue()}
          ryanValue={ryanRaw}
          isRyan={info.row.original._isRyan}
        />
      ),
    }),
    helper.accessor('indexed_time', {
      header: 'PAX',
      meta: { thClassName: 'text-right', tdClassName: 'text-right' },
      cell: info => (
        <DeltaCell
          value={info.getValue()}
          ryanValue={ryanPax}
          isRyan={info.row.original._isRyan}
        />
      ),
    }),
  ], [ryanRaw, ryanPax])

  if (rows.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          PST Results (Hypothetical)
        </h2>
        <span className="text-xs text-fg-muted">
          {rows.length - 1} PST drivers + your indexed time
        </span>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        getRowClassName={row => row._isRyan
          ? 'bg-bmw-blue/5 outline outline-1 outline-bmw-blue/20 [outline-offset:-1px]'
          : ''}
      />
    </div>
  )
}
