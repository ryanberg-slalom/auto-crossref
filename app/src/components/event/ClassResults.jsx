import { useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import DataTable from '../shared/DataTable'

const helper = createColumnHelper()

export default function ClassResults({ paxResults, classCode, ryanName }) {
  const classDrivers = useMemo(() =>
    paxResults
      .filter(d => d.class_code === classCode)
      .sort((a, b) => a.indexed_time - b.indexed_time),
    [paxResults, classCode]
  )

  const columns = useMemo(() => [
    helper.accessor((_, i) => i + 1, {
      id: 'pos',
      header: '#',
      cell: info => (
        <span className="text-bmw-blue font-semibold">
          {info.getValue()}
        </span>
      ),
    }),
    helper.accessor('name', {
      header: 'Name',
      cell: info => {
        const isRyan = info.getValue() === ryanName
        return (
          <span className={isRyan ? 'text-bmw-blue font-semibold' : 'text-fg'}>
            {info.getValue()}
            {isRyan && <span className="ml-1.5 text-[10px] opacity-60">(you)</span>}
          </span>
        )
      },
    }),
    helper.accessor('car', {
      header: 'Car',
      cell: info => (
        <span className="text-fg-muted">{info.getValue() || '—'}</span>
      ),
    }),
    helper.accessor('raw_time', {
      header: 'Raw',
      cell: info => (
        <span className="tabular-nums text-fg">{info.getValue()}s</span>
      ),
    }),
    helper.accessor('indexed_time', {
      header: 'Indexed',
      cell: info => (
        <span className="tabular-nums text-fg font-medium">{info.getValue()}s</span>
      ),
    }),
  ], [ryanName])

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
          {classCode} Class Results
        </h2>
        <span className="text-xs text-fg-muted">
          {classDrivers.length} driver{classDrivers.length !== 1 ? 's' : ''}
        </span>
      </div>
      <DataTable
        columns={columns}
        data={classDrivers}
        emptyMessage={`No ${classCode} drivers at this event`}
        getRowClassName={row => row.name === ryanName
          ? 'bg-bmw-blue/5 outline outline-1 outline-bmw-blue/20 [outline-offset:-1px]'
          : ''}
      />
    </div>
  )
}
