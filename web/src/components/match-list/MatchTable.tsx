import { useMemo } from 'react'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useHeroes, useMatches } from '../../api/hooks'
import { useFilters } from '../../state/filters'
import { useUI } from '../../state/ui'
import { buildColumns, SORTABLE_COLS } from './columns'
import type { Match, OrderBy } from '../../api/types'

export function MatchTable() {
  const filter = useFilters((s) => s.filter)
  const patch = useFilters((s) => s.patch)
  const density = useUI((s) => s.density)
  const navigate = useNavigate()

  const { data: heroes = [] } = useHeroes()
  const { data: matches = [], isLoading, isError, error } = useMatches(filter)

  const columns = useMemo(() => buildColumns(heroes), [heroes])
  const table = useReactTable<Match>({
    data: matches,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const rowHeight = density === 'compact' ? 'h-9' : 'h-12'
  const cellPad = density === 'compact' ? 'py-1.5' : 'py-2.5'

  const handleSort = (colId: string) => {
    const mapped = SORTABLE_COLS[colId]
    if (!mapped) return
    if (filter.order_by === mapped) {
      patch({ order_dir: filter.order_dir === 'desc' ? 'asc' : 'desc' })
    } else {
      patch({ order_by: mapped as OrderBy, order_dir: 'desc' })
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full text-left">
        <thead className="border-b border-border bg-surface2/40">
          <tr>
            {table.getHeaderGroups()[0].headers.map((h) => {
              const sortKey = SORTABLE_COLS[h.column.id]
              const active = sortKey === filter.order_by
              const sortable = Boolean(sortKey)
              return (
                <th
                  key={h.id}
                  onClick={() => sortable && handleSort(h.column.id)}
                  className={clsx(
                    'label-sm px-3 py-2 align-middle',
                    sortable && 'cursor-pointer select-none hover:text-text',
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {active && filter.order_dir === 'desc' && <ChevronDown size={10} />}
                    {active && filter.order_dir === 'asc' && <ChevronUp size={10} />}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: 10 }).map((_, i) => (
              <tr key={`skel-${i}`} className={clsx(rowHeight, 'border-b border-border/60')}>
                {columns.map((_, j) => (
                  <td key={j} className={clsx('px-3', cellPad)}>
                    <div className="h-4 skeleton" />
                  </td>
                ))}
              </tr>
            ))}
          {!isLoading &&
            table.getRowModel().rows.map((row) => {
              const won = row.original.won
              return (
                <tr
                  key={row.original.match_id}
                  onClick={() => navigate(`/match/${row.original.match_id}`)}
                  className={clsx(
                    rowHeight,
                    'cursor-pointer border-b border-border/60 border-l-2 transition-colors hover:bg-surface2/60',
                    won ? 'border-l-radiant/70' : 'border-l-dire/70',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={clsx('px-3 align-middle whitespace-nowrap', cellPad)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
        </tbody>
      </table>
      {!isLoading && matches.length === 0 && (
        <div className="py-10 text-center text-sm text-ghost">No matches match this filter.</div>
      )}
      {isError && (
        <div className="px-4 py-3 text-sm text-dire">Failed to load: {(error as Error).message}</div>
      )}
      {matches.length >= filter.limit && (
        <div className="flex items-center justify-center border-t border-border p-3">
          <button
            type="button"
            onClick={() => patch({ limit: filter.limit + 100 })}
            className="rounded-md border border-border2 px-3 py-1 text-xs text-muted hover:border-link hover:text-link"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
