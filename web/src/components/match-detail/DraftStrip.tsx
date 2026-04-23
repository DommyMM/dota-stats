import clsx from 'clsx'
import { useMemo } from 'react'
import { useHeroes } from '../../api/hooks'
import type { MatchDetail } from '../../api/types'
import { HeroIcon } from '../assets/HeroIcon'
import { heroByIdMap } from '../../lib/dota'

export function DraftStrip({ data }: { data: MatchDetail }) {
  const { data: heroes = [] } = useHeroes()
  const heroMap = useMemo(() => heroByIdMap(heroes), [heroes])

  if (data.draft.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 text-xs text-ghost">
        Draft data not available for this match.
      </section>
    )
  }

  const bans = data.draft.filter((d) => d.is_pick === false)
  const picks = data.draft.filter((d) => d.is_pick === true)
  const radiantBans = bans.filter((d) => d.is_radiant === true)
  const direBans = bans.filter((d) => d.is_radiant === false)
  const radiantPicks = picks.filter((d) => d.is_radiant === true)
  const direPicks = picks.filter((d) => d.is_radiant === false)

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border bg-surface2/40 px-4 py-2">
        <h3 className="label-sm">Draft</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <TeamColumn side="radiant" bans={radiantBans} picks={radiantPicks} heroMap={heroMap} />
        <TeamColumn side="dire" bans={direBans} picks={direPicks} heroMap={heroMap} />
      </div>
    </section>
  )
}

function TeamColumn({
  side,
  bans,
  picks,
  heroMap,
}: {
  side: 'radiant' | 'dire'
  bans: MatchDetail['draft']
  picks: MatchDetail['draft']
  heroMap: Map<number, import('../../api/types').Hero>
}) {
  const tone = side === 'radiant' ? 'text-radiant' : 'text-dire'
  return (
    <div className="flex flex-col gap-2">
      <div className={clsx('text-xs font-semibold uppercase tracking-wide', tone)}>{side}</div>
      <Row label="Bans" entries={bans} heroMap={heroMap} dim />
      <Row label="Picks" entries={picks} heroMap={heroMap} />
    </div>
  )
}

function Row({
  label,
  entries,
  heroMap,
  dim,
}: {
  label: string
  entries: MatchDetail['draft']
  heroMap: Map<number, import('../../api/types').Hero>
  dim?: boolean
}) {
  if (entries.length === 0) return null
  return (
    <div className="flex items-center gap-2">
      <span className="label-sm w-10">{label}</span>
      <div className="flex flex-wrap gap-1">
        {entries.map((e) => (
          <HeroIcon
            key={e.order_idx}
            hero={heroMap.get(e.hero_id)}
            size="md"
            className={dim ? 'opacity-60 grayscale' : undefined}
          />
        ))}
      </div>
    </div>
  )
}
