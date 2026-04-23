import clsx from 'clsx'
import { Star } from 'lucide-react'
import { useTeammateStats } from '../../api/hooks'
import { useFilters } from '../../state/filters'
import { fmtWR } from '../../lib/formatters'

export function TeammatesPanel() {
  const filter = useFilters((s) => s.filter)
  const patch = useFilters((s) => s.patch)
  const { data: teammates = [], isLoading } = useTeammateStats(filter, 30, 3)

  const addToWith = (account_id: number) => {
    if (filter.with_accounts.includes(account_id)) return
    patch({ with_accounts: [...filter.with_accounts, account_id] })
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="label-sm text-ghost">Teammates</h3>
        <span className="font-mono tnum text-[10px] text-ghost">
          {teammates.length} players
        </span>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 skeleton" />
          ))}
        </div>
      )}

      {!isLoading && teammates.length === 0 && (
        <div className="py-6 text-center text-xs text-ghost">
          No teammates with 3+ games yet.
        </div>
      )}

      {!isLoading && (
        <ul className="flex flex-col gap-0.5">
          {teammates.map((t) => {
            const tone =
              t.winrate > 0.52
                ? 'bg-radiant'
                : t.winrate < 0.48
                  ? 'bg-dire'
                  : 'bg-ghost2'
            const txt =
              t.winrate > 0.52
                ? 'text-radiant'
                : t.winrate < 0.48
                  ? 'text-dire'
                  : 'text-muted'
            return (
              <li key={t.account_id}>
                <button
                  type="button"
                  onClick={() => addToWith(t.account_id)}
                  className="group flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-border2/40"
                  title="Add to With filter"
                >
                  {t.tracked ? (
                    <Star size={10} className="shrink-0 text-gold" />
                  ) : (
                    <span className="shrink-0 w-2.5" />
                  )}
                  <span className="flex-1 truncate font-mono tnum text-text">
                    {t.account_id}
                  </span>
                  <div className="h-1.5 w-14 overflow-hidden rounded bg-border2">
                    <div
                      className={clsx('h-full', tone)}
                      style={{ width: `${Math.round(t.winrate * 100)}%` }}
                    />
                  </div>
                  <span className={clsx('w-10 text-right font-mono tnum', txt)}>
                    {fmtWR(t.winrate)}
                  </span>
                  <span className="w-8 text-right font-mono tnum text-ghost">{t.games}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
