import clsx from 'clsx'
import type { MatchDetail } from '../../api/types'
import { fmtGameTime } from '../../lib/dota'

type Obj = MatchDetail['objectives'][number]

const FRIENDLY: Record<string, string> = {
  CHAT_MESSAGE_TOWER_KILL: 'Tower',
  CHAT_MESSAGE_TOWER_DENY: 'Tower denied',
  CHAT_MESSAGE_BARRACKS_KILL: 'Barracks',
  CHAT_MESSAGE_FIRSTBLOOD: 'First blood',
  CHAT_MESSAGE_ROSHAN_KILL: 'Roshan',
  CHAT_MESSAGE_AEGIS: 'Aegis',
  CHAT_MESSAGE_AEGIS_STOLEN: 'Aegis stolen',
  building_kill: 'Building',
}

const TONE: Record<string, string> = {
  Roshan: 'text-gold border-gold/40',
  Tower: 'text-link border-link/40',
  'Tower denied': 'text-xp border-xp/40',
  Barracks: 'text-dire border-dire/40',
  'First blood': 'text-radiant border-radiant/40',
  Aegis: 'text-gold border-gold/40',
}

export function ObjectivesTimeline({ data }: { data: MatchDetail }) {
  if (data.objectives.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 text-xs text-ghost">
        Objective timeline not available.
      </section>
    )
  }

  const duration = Math.max(data.match.duration, 1)
  const items: Array<Obj & { label: string }> = data.objectives.map((o) => ({
    ...o,
    label: FRIENDLY[o.type] ?? o.type.replace(/^CHAT_MESSAGE_/, '').toLowerCase(),
  }))

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-baseline justify-between border-b border-border bg-surface2/40 px-4 py-2">
        <h3 className="label-sm">Objectives</h3>
        <span className="font-mono tnum text-[10px] text-ghost">
          {items.length} events
        </span>
      </div>

      <div className="relative h-14 px-4 py-3">
        <div className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-border2" />
        {items.map((o, idx) => {
          const t = Math.max(0, Math.min(1, o.time / duration))
          return (
            <div
              key={idx}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `calc(${t * 100}% )` }}
              title={`${fmtGameTime(o.time)} · ${o.label}${o.value != null ? ` (${o.value})` : ''}`}
            >
              <div
                className={clsx(
                  'h-2.5 w-2.5 rounded-full border bg-surface',
                  TONE[o.label] ?? 'border-ghost2 text-ghost',
                )}
              />
            </div>
          )
        })}
      </div>

      <div className="flex justify-between border-t border-border px-4 py-1 font-mono tnum text-[10px] text-ghost">
        <span>00:00</span>
        <span>{fmtGameTime(duration)}</span>
      </div>
    </section>
  )
}
