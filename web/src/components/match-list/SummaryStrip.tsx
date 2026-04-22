import { useSummary } from '../../api/hooks'
import { useFilters } from '../../state/filters'
import { fmtDate, fmtWR } from '../../lib/formatters'

export function SummaryStrip() {
  const filter = useFilters((s) => s.filter)
  const { data, isLoading } = useSummary(filter)

  if (isLoading && !data) {
    return (
      <div className="flex h-[52px] items-center rounded-lg border border-border bg-surface px-5">
        <div className="h-5 w-96 skeleton" />
      </div>
    )
  }

  if (!data || data.matches === 0) {
    return (
      <div className="flex h-[52px] items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm text-ghost">
        No matches for this filter.
      </div>
    )
  }

  return (
    <div className="flex h-[52px] items-center gap-6 rounded-lg border border-border bg-surface px-5 font-mono tnum text-sm">
      <Stat label="Matches" value={data.matches.toLocaleString('en-US')} tone="text" />
      <Stat label="W/L" value={`${data.wins}-${data.losses}`} tone="muted" />
      <Stat
        label="Win rate"
        value={fmtWR(data.winrate)}
        tone={data.winrate >= 0.5 ? 'radiant' : 'dire'}
      />
      <Stat
        label="K/D/A"
        value={`${data.avg_kills.toFixed(1)} / ${data.avg_deaths.toFixed(1)} / ${data.avg_assists.toFixed(1)}`}
        tone="muted"
      />
      <Stat label="GPM" value={Math.round(data.avg_gpm).toString()} tone="gold" />
      <Stat label="XPM" value={Math.round(data.avg_xpm).toString()} tone="xp" />
      {data.avg_imp != null && (
        <Stat label="IMP" value={data.avg_imp.toFixed(1)} tone="link" />
      )}
      {data.first_match && data.last_match && (
        <div className="ml-auto flex items-center gap-2 text-xs text-ghost">
          <span>{fmtDate(data.first_match)}</span>
          <span>→</span>
          <span>{fmtDate(data.last_match)}</span>
        </div>
      )}
    </div>
  )
}

const TONE_CLASS: Record<string, string> = {
  text: 'text-text',
  muted: 'text-muted',
  radiant: 'text-radiant',
  dire: 'text-dire',
  gold: 'text-gold',
  xp: 'text-xp',
  link: 'text-link',
}

function Stat({ label, value, tone = 'text' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="label-sm">{label}</span>
      <span className={TONE_CLASS[tone] ?? 'text-text'}>{value}</span>
    </div>
  )
}
