import { useMemo } from 'react'
import { useHeroes } from '../../api/hooks'
import type { MatchDetail } from '../../api/types'
import { HeroIcon } from '../assets/HeroIcon'
import { heroByIdMap } from '../../lib/dota'

export function KillFeed({ data }: { data: MatchDetail }) {
  const { data: heroes = [] } = useHeroes()
  const heroMap = useMemo(() => heroByIdMap(heroes), [heroes])

  const radiant = data.players.filter((p) => p.is_radiant)
  const dire = data.players.filter((p) => !p.is_radiant)

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border bg-surface2/40 px-4 py-2">
        <h3 className="label-sm">Kill Breakdown</h3>
      </div>
      <div className="space-y-1 p-4 text-xs">
        <div className="text-ghost">
          Per-hero kill log requires the replay parser (M9). Showing per-player totals instead.
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Column label="Radiant" players={radiant} heroMap={heroMap} />
          <Column label="Dire" players={dire} heroMap={heroMap} />
        </div>
      </div>
    </section>
  )
}

function Column({
  label,
  players,
  heroMap,
}: {
  label: string
  players: MatchDetail['players']
  heroMap: Map<number, import('../../api/types').Hero>
}) {
  const tone = label === 'Radiant' ? 'text-radiant' : 'text-dire'
  return (
    <div>
      <div className={`mb-1 text-[11px] font-semibold ${tone}`}>{label}</div>
      <ul className="space-y-1">
        {players.map((p) => {
          const hero = heroMap.get(p.hero_id)
          return (
            <li key={p.player_slot} className="flex items-center gap-2">
              <HeroIcon hero={hero} size="sm" />
              <span className="flex-1 truncate text-text">{hero?.localized_name ?? p.hero_id}</span>
              <span className="font-mono tnum text-muted">{p.kills} kills</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
