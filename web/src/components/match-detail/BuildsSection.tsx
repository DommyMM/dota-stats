import { useMemo } from 'react'
import clsx from 'clsx'
import { useAbilities, useHeroes, useItems } from '../../api/hooks'
import type {
  Ability,
  Hero,
  Item,
  MatchDetail,
  MatchDetailPlayer,
} from '../../api/types'
import { HeroIcon } from '../assets/HeroIcon'
import { AbilityIcon } from '../assets/AbilityIcon'
import { ItemIcon } from '../assets/ItemIcon'
import { fmtGameTime, heroByIdMap } from '../../lib/dota'

export function BuildsSection({ data }: { data: MatchDetail }) {
  const { data: heroes = [] } = useHeroes()
  const { data: items = [] } = useItems()
  const { data: abilities = [] } = useAbilities()

  const heroMap = useMemo(() => heroByIdMap(heroes), [heroes])
  const itemMap = useMemo(() => {
    const m = new Map<number, Item>()
    for (const i of items) m.set(i.item_id, i)
    return m
  }, [items])
  const abilityMap = useMemo(() => {
    const m = new Map<number, Ability>()
    for (const a of abilities) m.set(a.ability_id, a)
    return m
  }, [abilities])

  const anyBuildData =
    data.players.some((p) => p.ability_upgrades.length > 0) ||
    data.players.some((p) => p.items.some((i) => i.ts_purchased != null))

  if (!anyBuildData) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 text-xs text-ghost">
        Skill + item timelines require a parsed replay. Run{' '}
        <code className="font-mono text-muted">dota-local ingest enrich</code> to request a parse.
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="border-b border-border bg-surface2/40 px-4 py-2">
        <h3 className="label-sm">Builds</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        {data.players.map((p) => (
          <PlayerBuild
            key={p.player_slot}
            player={p}
            heroMap={heroMap}
            itemMap={itemMap}
            abilityMap={abilityMap}
          />
        ))}
      </div>
    </section>
  )
}

function PlayerBuild({
  player,
  heroMap,
  itemMap,
  abilityMap,
}: {
  player: MatchDetailPlayer
  heroMap: Map<number, Hero>
  itemMap: Map<number, Item>
  abilityMap: Map<number, Ability>
}) {
  const hero = heroMap.get(player.hero_id)
  const sortedAbilities = [...player.ability_upgrades].sort((a, b) => a.level - b.level)
  const purchases = player.items
    .filter((i) => i.ts_purchased != null && i.slot_idx < 9)
    .sort((a, b) => (a.ts_purchased ?? 0) - (b.ts_purchased ?? 0))

  return (
    <div
      className={clsx(
        'rounded-md border bg-surface2/30 p-3',
        player.is_radiant ? 'border-radiant/20' : 'border-dire/20',
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <HeroIcon hero={hero} size="sm" />
        <span className="text-sm text-text">
          {hero?.localized_name ?? `Hero ${player.hero_id}`}
        </span>
        <span className="ml-auto font-mono tnum text-[10px] text-ghost">
          lvl {player.level}
        </span>
      </div>

      <div className="mb-2">
        <span className="label-sm mb-1 block">Skills</span>
        {sortedAbilities.length === 0 ? (
          <span className="text-[10px] text-ghost">No ability timeline.</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {sortedAbilities.map((a) => {
              const ab = abilityMap.get(a.ability_id)
              return (
                <div key={`${a.ability_id}-${a.level}`} className="relative">
                  <AbilityIcon
                    ability={ab}
                    size="sm"
                    title={`${ab?.name ?? a.ability_id} · lvl ${a.level} @ ${fmtGameTime(a.time)}`}
                  />
                  <span className="absolute -bottom-1 -right-1 rounded bg-surface px-1 font-mono tnum text-[9px] text-muted ring-1 ring-border">
                    {a.level}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <span className="label-sm mb-1 block">Items</span>
        {purchases.length === 0 ? (
          <span className="text-[10px] text-ghost">No purchase timeline.</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {purchases.map((p) => {
              const it = itemMap.get(p.item_id)
              return (
                <div key={`${p.slot_idx}-${p.item_id}`} className="flex flex-col items-center gap-0.5">
                  <ItemIcon item={it} size="sm" title={`${it?.name ?? p.item_id} @ ${fmtGameTime(p.ts_purchased)}`} />
                  <span className="font-mono tnum text-[9px] text-ghost">
                    {fmtGameTime(p.ts_purchased)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
