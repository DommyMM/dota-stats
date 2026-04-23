import { useMemo } from 'react'
import { format, parseISO, startOfWeek, differenceInCalendarDays } from 'date-fns'
import clsx from 'clsx'
import { useActivity } from '../../api/hooks'
import { useFilters } from '../../state/filters'
import type { ActivityDay } from '../../api/types'

const WEEKS = 26
const DAYS_PER_WEEK = 7

type Cell = {
  date: Date
  games: number
  wins: number
}

type WeekColumn = Cell[]

function buildGrid(days: ActivityDay[]): { columns: WeekColumn[]; totalGames: number } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const gridStart = startOfWeek(
    new Date(today.getTime() - (WEEKS - 1) * DAYS_PER_WEEK * 86_400_000),
    { weekStartsOn: 0 },
  )

  const byIso = new Map<string, ActivityDay>()
  for (const d of days) byIso.set(d.day.slice(0, 10), d)

  const columns: WeekColumn[] = Array.from({ length: WEEKS }, () => [])
  let totalGames = 0
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const ts = new Date(gridStart.getTime() + (w * DAYS_PER_WEEK + d) * 86_400_000)
      const key = format(ts, 'yyyy-MM-dd')
      const rec = byIso.get(key)
      const cell = { date: ts, games: rec?.games ?? 0, wins: rec?.wins ?? 0 }
      columns[w].push(cell)
      totalGames += cell.games
    }
  }
  return { columns, totalGames }
}

function heatClass(games: number): string {
  if (games === 0) return 'bg-border2/60'
  if (games === 1) return 'bg-link/25'
  if (games <= 3) return 'bg-link/50'
  if (games <= 5) return 'bg-link/75'
  return 'bg-link'
}

export function ActivityHeatmap() {
  const filter = useFilters((s) => s.filter)
  const { data: days = [], isLoading } = useActivity(filter, WEEKS * DAYS_PER_WEEK)
  const { columns, totalGames } = useMemo(() => buildGrid(days), [days])

  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="label-sm text-ghost">Activity</h3>
        <span className="font-mono tnum text-[10px] text-ghost">
          {totalGames} games · {WEEKS}w
        </span>
      </div>

      {isLoading && <div className="h-24 skeleton" />}

      {!isLoading && (
        <div className="overflow-x-auto">
          <div className="flex gap-[3px]">
            {columns.map((col, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {col.map((cell, di) => {
                  const isFuture = differenceInCalendarDays(cell.date, today) > 0
                  if (isFuture) {
                    return <div key={di} className="h-2.5 w-2.5 rounded-sm bg-transparent" />
                  }
                  const losses = Math.max(0, cell.games - cell.wins)
                  return (
                    <div
                      key={di}
                      className={clsx('h-2.5 w-2.5 rounded-sm', heatClass(cell.games))}
                      title={
                        cell.games === 0
                          ? format(cell.date, 'yyyy-MM-dd')
                          : `${format(cell.date, 'yyyy-MM-dd')} · ${cell.games} games · ${cell.wins}W / ${losses}L`
                      }
                    />
                  )
                })}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-ghost">
            <span>{format(parseISO(columns[0][0].date.toISOString()), 'MMM d')}</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              {[0, 1, 3, 5, 6].map((g, i) => (
                <span key={i} className={clsx('h-2 w-2 rounded-sm', heatClass(g))} />
              ))}
              <span>More</span>
            </div>
            <span>{format(today, 'MMM d')}</span>
          </div>
        </div>
      )}
    </section>
  )
}
