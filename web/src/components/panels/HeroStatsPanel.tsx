import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useHeroes, useHeroStats } from '../../api/hooks'
import { useFilters } from '../../state/filters'
import { HeroIcon } from '../assets/HeroIcon'
import { fmtWR } from '../../lib/formatters'
import { heroByIdMap, heroIconUrl } from '../../lib/dota'
import type { Hero, HeroStat } from '../../api/types'

const ATTR_COLOR: Record<string, string> = {
  str: '#ff5454',
  agi: '#3dce84',
  int: '#4d9eff',
  all: '#e8a020',
}

export function HeroStatsPanel() {
  const filter = useFilters((s) => s.filter)
  const { data: stats = [], isLoading } = useHeroStats(filter, 50)
  const { data: heroes = [] } = useHeroes()
  const heroMap = useMemo(() => heroByIdMap(heroes), [heroes])

  const top = stats.slice(0, 6)
  const rest = stats.slice(6, 15)

  const option = useMemo(() => buildDonutOption(top, heroMap), [top, heroMap])

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="label-sm text-ghost">Most Played Heroes</h3>
        <span className="font-mono tnum text-[10px] text-ghost">
          {stats.length} heroes
        </span>
      </div>

      {isLoading && <div className="h-52 skeleton" />}

      {!isLoading && top.length === 0 && (
        <div className="py-6 text-center text-xs text-ghost">No data.</div>
      )}

      {!isLoading && top.length > 0 && (
        <>
          <div className="h-52">
            <ReactECharts
              option={option}
              style={{ height: '100%', width: '100%' }}
              notMerge
              lazyUpdate
            />
          </div>

          <ul className="mt-3 flex flex-col gap-1">
            {[...top, ...rest].map((s) => {
              const hero = heroMap.get(s.hero_id)
              const wrTone =
                s.winrate >= 0.52
                  ? 'text-radiant'
                  : s.winrate < 0.48
                    ? 'text-dire'
                    : 'text-muted'
              return (
                <li
                  key={s.hero_id}
                  className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-border2/40"
                >
                  <HeroIcon hero={hero} size="sm" />
                  <span className="flex-1 truncate text-text">
                    {hero?.localized_name ?? `Hero ${s.hero_id}`}
                  </span>
                  <span className={`font-mono tnum ${wrTone}`}>{fmtWR(s.winrate)}</span>
                  <span className="w-10 text-right font-mono tnum text-ghost">{s.games}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

function buildDonutOption(top: HeroStat[], heroMap: Map<number, Hero>) {
  // One rich-text key per hero — ECharts evaluates these lazily and
  // per-slice, which is the only way to get distinct images per pie wedge.
  const rich: Record<string, object> = {}
  for (const s of top) {
    const hero = heroMap.get(s.hero_id)
    const url = heroIconUrl(hero)
    if (!url) continue
    rich[`h${s.hero_id}`] = {
      width: 42,
      height: 24,
      backgroundColor: { image: url },
    }
  }

  const data = top.map((s) => {
    const hero = heroMap.get(s.hero_id)
    const color = ATTR_COLOR[hero?.primary_attr ?? 'all'] ?? '#8a9ab8'
    return {
      value: s.games,
      name: hero?.localized_name ?? `Hero ${s.hero_id}`,
      itemStyle: { color, borderColor: '#0a0e16', borderWidth: 2 },
      hero_id: s.hero_id,
      winrate: s.winrate,
      wins: s.wins,
      kda: `${s.avg_kills.toFixed(1)}/${s.avg_deaths.toFixed(1)}/${s.avg_assists.toFixed(1)}`,
      gpm: Math.round(s.avg_gpm),
    }
  })

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0d1420',
      borderColor: '#1a2232',
      textStyle: { color: '#c8d0e0', fontFamily: 'Inter, sans-serif', fontSize: 11 },
      formatter: (params: {
        name: string
        value: number
        data: { winrate: number; wins: number; kda: string; gpm: number }
      }) => {
        const d = params.data
        return (
          `<div style="font-weight:600">${params.name}</div>` +
          `<div>${params.value} games · <span style="color:#3dce84">${(d.winrate * 100).toFixed(1)}%</span></div>` +
          `<div style="color:#8a9ab8">${d.kda} · ${d.gpm} gpm</div>`
        )
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['42%', '62%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: {
          show: true,
          position: 'outside',
          formatter: (p: { data: { hero_id: number } }) =>
            rich[`h${p.data.hero_id}`] ? `{h${p.data.hero_id}|}` : '',
          rich,
        },
        labelLine: {
          show: true,
          length: 4,
          length2: 4,
          lineStyle: { color: '#1a2232' },
        },
        emphasis: { scale: true, scaleSize: 4 },
        data,
      },
    ],
  }
}
