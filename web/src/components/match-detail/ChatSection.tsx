import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { MatchDetail } from '../../api/types'
import { fmtGameTime, heroByIdMap } from '../../lib/dota'
import { useHeroes } from '../../api/hooks'

export function ChatSection({ data }: { data: MatchDetail }) {
  const [open, setOpen] = useState(false)
  const { data: heroes = [] } = useHeroes()
  const heroMap = useMemo(() => heroByIdMap(heroes), [heroes])

  const slotToHero = useMemo(() => {
    const m = new Map<number, { hero_id: number; is_radiant: boolean }>()
    for (const p of data.players) {
      m.set(p.player_slot, { hero_id: p.hero_id, is_radiant: p.is_radiant })
    }
    return m
  }, [data.players])

  if (data.chat.length === 0) return null

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-border bg-surface2/40 px-4 py-2 text-left hover:bg-surface2/60"
      >
        <span className="label-sm">Chat</span>
        <span className="flex items-center gap-2 text-xs text-ghost">
          {data.chat.length} messages
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
      </button>
      {open && (
        <div className="max-h-80 overflow-y-auto p-4">
          <ul className="space-y-1 font-mono tnum text-[11px]">
            {data.chat.map((c, i) => {
              const player = slotToHero.get(c.slot)
              const hero = player && heroMap.get(player.hero_id)
              const tone = player
                ? player.is_radiant
                  ? 'text-radiant'
                  : 'text-dire'
                : 'text-muted'
              return (
                <li key={i} className="grid grid-cols-[52px_120px_1fr] gap-3">
                  <span className="text-ghost">{fmtGameTime(c.time)}</span>
                  <span className={clsx('truncate', tone)}>
                    {hero?.localized_name ?? `Slot ${c.slot}`}
                  </span>
                  <span className="text-text">{c.text}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
