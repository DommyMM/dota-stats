import { useFilters } from '../state/filters'
import { useMatches, useSummary } from '../api/hooks'
import { fmtWR } from '../lib/formatters'

export function MatchesPage() {
  const filter = useFilters((s) => s.filter)
  const matches = useMatches(filter)
  const summary = useSummary(filter)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="label-sm mb-2">Summary</div>
        {summary.isLoading && <div className="h-5 w-64 skeleton" />}
        {summary.data && (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 font-mono tnum text-sm">
            <span className="text-text">{summary.data.matches} matches</span>
            <span className="text-muted">
              {summary.data.wins}-{summary.data.losses}
            </span>
            <span className="text-radiant">{fmtWR(summary.data.winrate)} WR</span>
            <span className="text-muted">
              {summary.data.avg_kills.toFixed(1)} / {summary.data.avg_deaths.toFixed(1)} /{' '}
              {summary.data.avg_assists.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="label-sm mb-2">Matches</div>
        {matches.isLoading && <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 skeleton" />
          ))}
        </div>}
        {matches.data && (
          <div className="text-sm text-muted">
            Loaded {matches.data.length} match rows — table comes in F1.
          </div>
        )}
        {matches.isError && (
          <div className="text-sm text-dire">
            Failed to load: {(matches.error as Error).message}
          </div>
        )}
      </div>
    </div>
  )
}
