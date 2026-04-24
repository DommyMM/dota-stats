import clsx from 'clsx'
import type { ColumnDef } from '@tanstack/react-table'
import type { Match, OrderBy } from '../../api/types'
import { HeroIcon } from '../assets/HeroIcon'
import { OutcomeBadge } from '../ui/OutcomeBadge'
import { fmtDuration, fmtInt, fmtKNum, fmtRelTime } from '../../lib/formatters'
import { heroByIdMap, impColor } from '../../lib/dota'
import {
  GAME_MODE_NAMES,
  LOBBY_TYPE_NAMES,
  POSITION_NAMES,
  rankTierLabel,
} from '../../lib/constants'
import type { Hero } from '../../api/types'

export function buildColumns(heroes: Hero[]): ColumnDef<Match>[] {
  const heroMap = heroByIdMap(heroes)

  return [
    {
      id: 'hero',
      header: 'Hero',
      accessorKey: 'hero_id',
      cell: ({ row }) => {
        const hero = heroMap.get(row.original.hero_id)
        return (
          <div className="flex items-center gap-3">
            <HeroIcon hero={hero} size="md" />
            <div className="flex flex-col">
              <span className="truncate text-sm text-text">
                {hero?.localized_name ?? `Hero ${row.original.hero_id}`}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ghost">
                <span>{row.original.is_radiant ? 'Radiant' : 'Dire'}</span>
                <OutcomeBadge outcome={row.original.analysis_outcome} size="sm" />
              </span>
            </div>
          </div>
        )
      },
    },
    {
      id: 'result',
      header: '',
      accessorKey: 'won',
      cell: ({ row }) => {
        const won = row.original.won
        return (
          <span
            className={clsx(
              'inline-flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold',
              won ? 'bg-radiant/15 text-radiant' : 'bg-dire/15 text-dire',
            )}
          >
            {won ? 'W' : 'L'}
          </span>
        )
      },
    },
    {
      id: 'role',
      header: 'Role',
      accessorKey: 'lane_role',
      cell: ({ row }) => {
        const lane = row.original.lane_role
        const name = lane != null ? POSITION_NAMES[lane] : null
        if (!name) return <span className="text-ghost">—</span>
        return (
          <span className="inline-flex items-center rounded bg-border2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
            {name}
          </span>
        )
      },
    },
    {
      id: 'kda',
      header: 'K / D / A',
      cell: ({ row }) => {
        const m = row.original
        return (
          <span className="font-mono tnum text-sm">
            <span className="text-radiant">{m.kills}</span>
            <span className="text-ghost"> / </span>
            <span className="text-dire">{m.deaths}</span>
            <span className="text-ghost"> / </span>
            <span className="text-gold">{m.assists}</span>
          </span>
        )
      },
    },
    {
      id: 'imp',
      header: 'IMP',
      accessorKey: 'imp',
      cell: ({ row }) => {
        const v = row.original.imp
        if (v == null) return <span className="text-ghost">—</span>
        const sign = v > 0 ? '+' : ''
        return (
          <span className={clsx('font-mono tnum text-sm', impColor(v))}>
            {sign}
            {Math.round(v)}
          </span>
        )
      },
    },
    {
      id: 'level',
      header: 'Lvl',
      accessorKey: 'level',
      cell: ({ row }) => (
        <span className="font-mono tnum text-sm text-muted">{row.original.level}</span>
      ),
    },
    {
      id: 'net_worth',
      header: 'Net worth',
      accessorKey: 'net_worth',
      cell: ({ row }) => (
        <span className="font-mono tnum text-sm text-gold">{fmtKNum(row.original.net_worth)}</span>
      ),
    },
    {
      id: 'gpm_xpm',
      header: 'GPM / XPM',
      cell: ({ row }) => (
        <div className="flex flex-col font-mono tnum text-[11px] leading-tight">
          <span className="text-gold">{fmtInt(row.original.gpm)}</span>
          <span className="text-xp">{fmtInt(row.original.xpm)}</span>
        </div>
      ),
    },
    {
      id: 'hero_damage',
      header: 'HD',
      accessorKey: 'hero_damage',
      cell: ({ row }) => (
        <span className="font-mono tnum text-sm text-muted">
          {fmtKNum(row.original.hero_damage)}
        </span>
      ),
    },
    {
      id: 'tower_damage',
      header: 'TD',
      accessorKey: 'tower_damage',
      cell: ({ row }) => (
        <span className="font-mono tnum text-sm text-muted">
          {fmtKNum(row.original.tower_damage)}
        </span>
      ),
    },
    {
      id: 'party',
      header: 'Party',
      accessorKey: 'party_size',
      cell: ({ row }) => {
        const p = row.original.party_size
        if (!p || p <= 1) return <span className="text-xs text-ghost">Solo</span>
        return (
          <span className="inline-flex items-center rounded bg-border2 px-2 py-0.5 text-[10px] font-semibold text-muted">
            P{p}
          </span>
        )
      },
    },
    {
      id: 'rank',
      header: 'Rank',
      accessorKey: 'rank_tier',
      cell: ({ row }) => (
        <span className="text-xs text-muted">{rankTierLabel(row.original.rank_tier)}</span>
      ),
    },
    {
      id: 'mode',
      header: 'Mode',
      cell: ({ row }) => {
        const mode = GAME_MODE_NAMES[row.original.game_mode] ?? `Mode ${row.original.game_mode}`
        const lobby = LOBBY_TYPE_NAMES[row.original.lobby_type]
        return (
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-text">{mode}</span>
            {lobby && <span className="text-[10px] text-ghost">{lobby}</span>}
          </div>
        )
      },
    },
    {
      id: 'duration',
      header: 'Time',
      accessorKey: 'duration',
      cell: ({ row }) => (
        <span className="font-mono tnum text-xs text-muted">{fmtDuration(row.original.duration)}</span>
      ),
    },
    {
      id: 'when',
      header: 'When',
      accessorKey: 'start_time',
      cell: ({ row }) => (
        <span
          className="text-xs text-muted"
          title={new Date(row.original.start_time).toLocaleString()}
        >
          {fmtRelTime(row.original.start_time)}
        </span>
      ),
    },
  ]
}

export const SORTABLE_COLS: Record<string, OrderBy> = {
  kda: 'kills',
  imp: 'imp',
  net_worth: 'net_worth',
  gpm_xpm: 'gpm',
  duration: 'duration',
  when: 'start_time',
}
