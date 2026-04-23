import clsx from 'clsx'
import { Copy, ExternalLink } from 'lucide-react'
import type { MatchDetail } from '../../api/types'
import { fmtDate, fmtDuration } from '../../lib/formatters'
import { GAME_MODE_NAMES, LOBBY_TYPE_NAMES, rankTierLabel } from '../../lib/constants'

export function HeaderBar({ data }: { data: MatchDetail }) {
  const m = data.match
  const radiantKills = data.players
    .filter((p) => p.is_radiant)
    .reduce((acc, p) => acc + p.kills, 0)
  const direKills = data.players
    .filter((p) => !p.is_radiant)
    .reduce((acc, p) => acc + p.kills, 0)

  const mode = GAME_MODE_NAMES[m.game_mode] ?? `Mode ${m.game_mode}`
  const lobby = LOBBY_TYPE_NAMES[m.lobby_type]

  const copyId = () => navigator.clipboard.writeText(String(m.match_id))

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-4">
        <TeamHeader
          side="radiant"
          won={m.radiant_win}
          kills={radiantKills}
        />
        <div className="flex flex-col items-center gap-1 font-mono tnum">
          <div className="flex items-baseline gap-3">
            <span className={m.radiant_win ? 'text-radiant text-2xl font-bold' : 'text-muted text-2xl'}>
              {radiantKills}
            </span>
            <span className="text-ghost">–</span>
            <span className={!m.radiant_win ? 'text-dire text-2xl font-bold' : 'text-muted text-2xl'}>
              {direKills}
            </span>
          </div>
          <div className="text-xs text-ghost">{fmtDuration(m.duration)}</div>
        </div>
        <TeamHeader
          side="dire"
          won={!m.radiant_win}
          kills={direKills}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border bg-surface2/40 px-5 py-2 text-xs text-muted">
        <span className="text-text">{mode}</span>
        {lobby && <span>{lobby}</span>}
        {m.avg_rank_tier != null && <span>{rankTierLabel(m.avg_rank_tier)}</span>}
        {m.patch != null && <span>Patch {m.patch}</span>}
        <span>{fmtDate(m.start_time)}</span>
        <button
          type="button"
          onClick={copyId}
          className="inline-flex items-center gap-1 font-mono tnum text-ghost hover:text-link"
          title="Copy match id"
        >
          {m.match_id}
          <Copy size={10} />
        </button>
        <span
          className={clsx(
            'ml-auto inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
            m.parse_status === 'parsed'
              ? 'border-radiant/30 text-radiant'
              : 'border-ghost2 text-ghost',
          )}
        >
          Parse: {m.parse_status}
        </span>
        {m.replay_url && (
          <a
            href={m.replay_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-link hover:underline"
          >
            Replay <ExternalLink size={10} />
          </a>
        )}
      </div>
    </section>
  )
}

function TeamHeader({
  side,
  won,
  kills,
}: {
  side: 'radiant' | 'dire'
  won: boolean
  kills: number
}) {
  const color = side === 'radiant' ? 'text-radiant' : 'text-dire'
  return (
    <div className={clsx('flex flex-col', side === 'dire' && 'items-end text-right')}>
      <div className={clsx('text-lg font-semibold capitalize', color)}>{side}</div>
      <div className="text-xs text-muted">
        {won ? 'Won' : 'Lost'} · {kills} kills
      </div>
    </div>
  )
}
