import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useMatchDetail } from '../api/hooks'
import { fmtDate, fmtDuration } from '../lib/formatters'

export function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const id = matchId ? Number(matchId) : null
  const { data, isLoading, isError, error } = useMatchDetail(id)

  return (
    <div className="space-y-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-text"
      >
        <ChevronLeft size={14} /> Back to matches
      </Link>

      {isLoading && <div className="h-24 skeleton" />}
      {isError && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-dire">
          {(error as Error).message}
        </div>
      )}
      {data && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="label-sm mb-2">Match {data.match.match_id}</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono tnum text-sm">
            <span>{fmtDate(data.match.start_time)}</span>
            <span className="text-muted">{fmtDuration(data.match.duration)}</span>
            <span className={data.match.radiant_win ? 'text-radiant' : 'text-dire'}>
              {data.match.radiant_win ? 'Radiant win' : 'Dire win'}
            </span>
            <span className="text-muted">parse: {data.match.parse_status}</span>
          </div>
          <div className="mt-4 text-xs text-ghost">
            Scoreboard, net-worth chart, draft strip, and builds wire up in F3.
          </div>
        </div>
      )}
    </div>
  )
}
