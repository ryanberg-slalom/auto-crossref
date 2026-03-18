import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table'

export default function DataTable({
  columns,
  data,
  getRowClassName,
  onRowClick,
  emptyMessage = 'No data',
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface-2">
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id} className="bg-subnav border-b border-border">
              {hg.headers.map(header => (
                <th
                  key={header.id}
                  className={[
                    'px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-subtle whitespace-nowrap',
                    header.column.columnDef.meta?.thClassName ?? '',
                  ].filter(Boolean).join(' ')}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-xs text-center text-fg-subtle"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const rowClassName = getRowClassName ? getRowClassName(row.original) : ''
              const isLast = i === rows.length - 1
              return (
                <tr
                  key={row.id}
                  className={[
                    !isLast ? 'border-b border-border-subtle' : '',
                    onRowClick ? 'cursor-pointer hover:bg-surface-3' : '',
                    rowClassName,
                  ].filter(Boolean).join(' ')}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className={[
                      'px-4 py-[9px] text-xs text-fg',
                      cell.column.columnDef.meta?.tdClassName ?? '',
                    ].filter(Boolean).join(' ')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
