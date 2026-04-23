import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useMatchDetail } from '../api/hooks'
import { HeaderBar } from '../components/match-detail/HeaderBar'
import { ScoreboardGrid } from '../components/match-detail/ScoreboardGrid'
import { DraftStrip } from '../components/match-detail/DraftStrip'
import { BuildsSection } from '../components/match-detail/BuildsSection'
import { ObjectivesTimeline } from '../components/match-detail/ObjectivesTimeline'
import { KillFeed } from '../components/match-detail/KillFeed'
import { ChatSection } from '../components/match-detail/ChatSection'

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

      {isLoading && (
        <div className="space-y-4">
          <div className="h-24 skeleton" />
          <div className="h-64 skeleton" />
          <div className="h-64 skeleton" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-dire">
          {(error as Error).message}
        </div>
      )}

      {data && (
        <>
          <HeaderBar data={data} />

          {data.match.parse_status !== 'parsed' && (
            <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
              This match hasn't been fully parsed ({data.match.parse_status}). Some timelines and
              detail may be missing until a replay parse is requested via{' '}
              <code className="font-mono">dota-local ingest enrich --recent-only</code>.
            </div>
          )}

          <ScoreboardGrid data={data} />

          <div className="rounded-lg border border-border bg-surface p-4 text-xs text-ghost">
            Net-worth / XP chart requires a per-minute series (replay-parser output, M9). Showing
            per-player final net worth in the scoreboard above.
          </div>

          <DraftStrip data={data} />
          <BuildsSection data={data} />
          <ObjectivesTimeline data={data} />
          <KillFeed data={data} />
          <ChatSection data={data} />
        </>
      )}
    </div>
  )
}
