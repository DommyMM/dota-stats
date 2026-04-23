import clsx from 'clsx'
import { useMemo } from 'react'
import { useHeroes, useItems } from '../../api/hooks'
import type { Hero, Item, MatchDetail, MatchDetailPlayer } from '../../api/types'
import { HeroIcon } from '../assets/HeroIcon'
import { ItemIcon } from '../assets/ItemIcon'
import { fmtKNum } from '../../lib/formatters'
import { impColor, heroByIdMap } from '../../lib/dota'
import { POSITION_NAMES, rankTierLabel } from '../../lib/constants'

export function ScoreboardGrid({ data }: { data: MatchDetail }) {
  const { data: heroes = [] } = useHeroes()
  const { data: items = [] } = useItems()

  const heroMap = useMemo(() => heroByIdMap(heroes), [heroes])
  const itemMap = useMemo(() => {
    const m = new Map<number, Item>()
    for (const i of items) m.set(i.item_id, i)
    return m
  }, [items])

  const radiant = data.players.filter((p) => p.is_radiant)
  const dire = data.players.filter((p) => !p.is_radiant)
  const radiantWon = data.match.radiant_win

  return (
    <section className="space-y-4">
      <TeamBlock
        title="Radiant"
        won={radiantWon}
        players={radiant}
        heroMap={heroMap}
        itemMap={itemMap}
      />
      <TeamBlock
        title="Dire"
        won={!radiantWon}
        players={dire}
        heroMap={heroMap}
        itemMap={itemMap}
      />
    </section>
  )
}

function TeamBlock({
  title,
  won,
  players,
  heroMap,
  itemMap,
}: {
  title: 'Radiant' | 'Dire'
  won: boolean
  players: MatchDetailPlayer[]
  heroMap: Map<number, Hero>
  itemMap: Map<number, Item>
}) {
  const tone = title === 'Radiant' ? 'text-radiant' : 'text-dire'
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-baseline justify-between border-b border-border bg-surface2/40 px-4 py-2">
        <h3 className={clsx('text-sm font-semibold', tone)}>{title}</h3>
        <span className="text-xs text-muted">{won ? 'Won' : 'Lost'}</span>
      </div>
      <div className="divide-y divide-border/60">
        {players.map((p) => (
          <PlayerRow key={p.player_slot} player={p} heroMap={heroMap} itemMap={itemMap} />
        ))}
      </div>
    </div>
  )
}

function PlayerRow({
  player,
  heroMap,
  itemMap,
}: {
  player: MatchDetailPlayer
  heroMap: Map<number, Hero>
  itemMap: Map<number, Item>
}) {
  const hero = heroMap.get(player.hero_id)
  const role = player.lane_role != null ? POSITION_NAMES[player.lane_role] : null

  // Items slots 0–5 = active inventory; 6–8 backpack; 9 = neutral in OpenDota.
  const byIdx = new Map<number, Item | undefined>()
  for (const it of player.items) {
    byIdx.set(it.slot_idx, itemMap.get(it.item_id))
  }

  const active = Array.from({ length: 6 }, (_, i) => byIdx.get(i))
  const backpack = Array.from({ length: 3 }, (_, i) => byIdx.get(i + 6))
  const neutral = byIdx.get(9)

  return (
    <div className="grid grid-cols-[200px_88px_120px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-2 text-xs">
      <div className="flex items-center gap-3 min-w-0">
        <HeroIcon hero={hero} size="md" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-text">
            {hero?.localized_name ?? `Hero ${player.hero_id}`}
          </span>
          <span className="flex items-center gap-2 text-[10px] text-ghost">
            {role && <span className="uppercase tracking-wide">{role}</span>}
            {player.leaver_status > 0 && (
              <span className="rounded bg-dire/15 px-1 text-dire">Leaver</span>
            )}
          </span>
        </div>
      </div>

      <div className="font-mono tnum">
        <span className="text-radiant">{player.kills}</span>
        <span className="text-ghost"> / </span>
        <span className="text-dire">{player.deaths}</span>
        <span className="text-ghost"> / </span>
        <span className="text-gold">{player.assists}</span>
      </div>

      <div className="flex flex-col font-mono tnum text-[11px] leading-tight">
        <span className="text-gold">{player.gpm} gpm</span>
        <span className="text-xp">{player.xpm} xpm</span>
      </div>

      <div className="flex items-center gap-3 font-mono tnum text-muted">
        <span className="text-gold">{fmtKNum(player.net_worth)}</span>
        <span>lvl {player.level}</span>
        <span>{fmtKNum(player.hero_damage)} HD</span>
        <span>{fmtKNum(player.tower_damage)} TD</span>
        {player.imp != null && (
          <span className={impColor(player.imp)}>
            IMP {player.imp > 0 ? '+' : ''}
            {Math.round(player.imp)}
          </span>
        )}
        <span className="ml-auto text-ghost">{rankTierLabel(player.rank_tier)}</span>
      </div>

      <div className="flex items-center gap-1">
        <div className="grid grid-cols-3 gap-0.5">
          {active.map((it, i) => (
            <ItemIcon key={`a-${i}`} item={it} size="sm" />
          ))}
        </div>
        <div className="mx-1 h-6 w-px bg-border" />
        <div className="flex gap-0.5">
          {backpack.map((it, i) => (
            <ItemIcon key={`b-${i}`} item={it} size="sm" className="opacity-80" />
          ))}
        </div>
        <div className="mx-1 h-6 w-px bg-border" />
        <ItemIcon item={neutral} size="sm" className="ring-gold/40" />
        <span className="ml-2 font-mono tnum text-[10px] text-ghost">#{player.account_id ?? '—'}</span>
      </div>
    </div>
  )
}
