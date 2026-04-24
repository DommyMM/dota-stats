import clsx from 'clsx'
import type { MatchDetail } from '../../api/types'

// Stratz's LaneOutcomeEnums as surfaced verbatim — prefix = winning team,
// suffix = margin (stomp > victory > tie).
function labelFor(outcome: string | null): { text: string; tone: string } {
  if (!outcome) return { text: '—', tone: 'text-ghost' }
  const v = outcome.toLowerCase()
  if (v.includes('radiant')) {
    return {
      text: v.includes('stomp') ? 'Radiant stomp' : 'Radiant won',
      tone: 'text-radiant',
    }
  }
  if (v.includes('dire')) {
    return {
      text: v.includes('stomp') ? 'Dire stomp' : 'Dire won',
      tone: 'text-dire',
    }
  }
  if (v === 'tie' || v === 'none') return { text: 'Draw', tone: 'text-ghost' }
  return { text: v.replace(/_/g, ' '), tone: 'text-muted' }
}

export function LaneOutcomes({ data }: { data: MatchDetail }) {
  const m = data.match
  if (!m.top_lane_outcome && !m.mid_lane_outcome && !m.bot_lane_outcome) {
    // Stratz hasn't tagged this match (unparsed on their side).
    return null
  }
  const rows = [
    { label: 'Top', value: m.top_lane_outcome },
    { label: 'Mid', value: m.mid_lane_outcome },
    { label: 'Bot', value: m.bot_lane_outcome },
  ]
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border bg-surface2/40 px-4 py-2">
        <h3 className="label-sm">Lane outcomes</h3>
      </div>
      <dl className="grid grid-cols-3 gap-3 px-4 py-3 text-xs">
        {rows.map((r) => {
          const { text, tone } = labelFor(r.value)
          return (
            <div key={r.label} className="flex flex-col gap-0.5">
              <dt className="label-sm">{r.label}</dt>
              <dd className={clsx('font-semibold', tone)}>{text}</dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
