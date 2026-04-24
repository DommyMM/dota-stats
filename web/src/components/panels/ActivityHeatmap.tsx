import { useMemo } from 'react'
import { format, startOfWeek } from 'date-fns'
import clsx from 'clsx'
import { useActivity } from '../../api/hooks'
import { useFilters } from '../../state/filters'
import type { ActivityDay } from '../../api/types'

// 20 weeks × 7 days fits comfortably in a 320px rail (~13px per column
// incl. gap) without horizontal scroll.
const WEEKS = 20
const DAYS_PER_WEEK = 7

type Cell = {
  date: Date
  games: number
  wins: number
  inRange: boolean
}

function buildGrid(days: ActivityDay[]): { columns: Cell[][]; totalGames: number; monthLabels: Array<{ col: number; label: string }> } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const gridStart = startOfWeek(
    new Date(today.getTime() - (WEEKS - 1) * DAYS_PER_WEEK * 86_400_000),
    { weekStartsOn: 0 },
  )

  const byIso = new Map<string, ActivityDay>()
  for (const d of days) byIso.set(d.day.slice(0, 10), d)

  const columns: Cell[][] = Array.from({ length: WEEKS }, () => [])
  let totalGames = 0
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const ts = new Date(gridStart.getTime() + (w * DAYS_PER_WEEK + d) * 86_400_000)
      const key = format(ts, 'yyyy-MM-dd')
      const rec = byIso.get(key)
      const inRange = ts.getTime() <= today.getTime()
      const cell: Cell = {
        date: ts,
        games: rec?.games ?? 0,
        wins: rec?.wins ?? 0,
        inRange,
      }
      columns[w].push(cell)
      if (inRange) totalGames += cell.games
    }
  }

  // Month labels: one per week-column where the month flips.
  const monthLabels: Array<{ col: number; label: string }> = []
  let lastMonth: string | null = null
  for (let w = 0; w < WEEKS; w++) {
    const firstOfCol = columns[w][0].date
    const m = format(firstOfCol, 'MMM')
    if (m !== lastMonth) {
      monthLabels.push({ col: w, label: m })
      lastMonth = m
    }
  }

  return { columns, totalGames, monthLabels }
}

// Stratz-style: size = games played, color = winrate.
function sizePct(games: number): number {
  if (games === 0) return 0
  if (games === 1) return 45
  if (games === 2) return 60
  if (games === 3) return 72
  if (games <= 5) return 85
  return 100
}

function colorFor(games: number, wins: number): string {
  if (games === 0) return 'transparent'
  const wr = wins / games
  if (wr >= 0.75) return '#3dce84' // radiant green
  if (wr >= 0.55) return '#8fd66a' // lime
  if (wr >= 0.45) return '#e8a020' // gold — mixed
  if (wr >= 0.25) return '#ff8a3d' // orange
  return '#ff5454' // dire red
}

function intensityLabel(avg: number): string {
  if (avg >= 2.0) return 'Intense'
  if (avg >= 1.0) return 'Active'
  if (avg >= 0.3) return 'Steady'
  return 'Light'
}

export function ActivityHeatmap() {
  const filter = useFilters((s) => s.filter)
  const { data: days = [], isLoading } = useActivity(filter, WEEKS * DAYS_PER_WEEK)
  const { columns, totalGames, monthLabels } = useMemo(() => buildGrid(days), [days])

  const daysInRange = WEEKS * DAYS_PER_WEEK
  const avgPerDay = totalGames / Math.max(daysInRange, 1)

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="label-sm text-ghost">
          Activity: <span className="text-text">{intensityLabel(avgPerDay)}</span>
        </h3>
        <span className="font-mono tnum text-[10px] text-ghost">
          {totalGames} games · {WEEKS}w
        </span>
      </div>

      {isLoading && <div className="h-36 skeleton" />}

      {!isLoading && (
        <div className="flex flex-col gap-1">
          {/* Month label track above the grid. */}
          <div
            className="relative h-3 text-[9px] uppercase tracking-wide text-ghost2"
            style={{ paddingRight: 0 }}
          >
            {monthLabels.map((m) => (
              <span
                key={m.col}
                className="absolute"
                style={{ left: `calc(${(m.col / WEEKS) * 100}%)` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${WEEKS}, 1fr)`,
              gridTemplateRows: `repeat(${DAYS_PER_WEEK}, 1fr)`,
              gridAutoFlow: 'column',
              gap: '2px',
              // Fixed aspect ratio so cells stay square regardless of rail width.
              aspectRatio: `${WEEKS} / ${DAYS_PER_WEEK}`,
            }}
          >
            {columns.flat().map((cell, i) => {
              const pct = cell.inRange ? sizePct(cell.games) : 0
              const bg = cell.inRange ? colorFor(cell.games, cell.wins) : 'transparent'
              const losses = Math.max(0, cell.games - cell.wins)
              const tip = cell.inRange
                ? cell.games === 0
                  ? format(cell.date, 'MMM d')
                  : `${format(cell.date, 'MMM d')} · ${cell.games} games · ${cell.wins}W / ${losses}L`
                : ''
              return (
                <div
                  key={i}
                  className={clsx(
                    'relative rounded-[1px]',
                    cell.inRange ? 'bg-border2/50' : 'bg-transparent',
                  )}
                  title={tip}
                >
                  {pct > 0 && (
                    <div
                      className="absolute left-1/2 top-1/2 rounded-[1px]"
                      style={{
                        backgroundColor: bg,
                        width: `${pct}%`,
                        height: `${pct}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-1 flex items-center justify-between text-[10px] text-ghost">
            <span>
              {columns[0][0] && format(columns[0][0].date, 'MMM d')}
            </span>
            <span className="flex items-center gap-1.5">
              <span>Losses</span>
              <span className="h-2 w-2 rounded-sm bg-[#ff5454]" />
              <span className="h-2 w-2 rounded-sm bg-[#ff8a3d]" />
              <span className="h-2 w-2 rounded-sm bg-[#e8a020]" />
              <span className="h-2 w-2 rounded-sm bg-[#8fd66a]" />
              <span className="h-2 w-2 rounded-sm bg-[#3dce84]" />
              <span>Wins</span>
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
