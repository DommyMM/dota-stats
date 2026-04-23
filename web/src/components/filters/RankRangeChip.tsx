import { useFilters } from '../../state/filters'
import { RANK_TIER_NAMES, rankTierLabel } from '../../lib/constants'
import { Chip } from '../ui/Chip'
import { Popover } from '../ui/Popover'

// Rank tier is `medal*10 + stars` (e.g. 42 = Archon 2).
const MIN_TIER = 11 // Herald 1
const MAX_TIER = 80 // Immortal

export function RankRangeChip() {
  const rank_tier_min = useFilters((s) => s.filter.rank_tier_min)
  const rank_tier_max = useFilters((s) => s.filter.rank_tier_max)
  const patch = useFilters((s) => s.patch)

  const active = rank_tier_min != null || rank_tier_max != null
  if (!active) return null

  const display = `${rank_tier_min != null ? rankTierLabel(rank_tier_min) : '—'} → ${rank_tier_max != null ? rankTierLabel(rank_tier_max) : '—'}`

  return (
    <Popover
      className="w-[280px] p-3"
      trigger={({ toggle }) => (
        <Chip
          label="Rank"
          display={display}
          active
          onClick={toggle}
          onClear={() => patch({ rank_tier_min: undefined, rank_tier_max: undefined })}
        />
      )}
    >
      <div className="flex flex-col gap-3 text-xs">
        <Row
          label="Min"
          value={rank_tier_min ?? MIN_TIER}
          onChange={(v) => patch({ rank_tier_min: v })}
        />
        <Row
          label="Max"
          value={rank_tier_max ?? MAX_TIER}
          onChange={(v) => patch({ rank_tier_max: v })}
        />
      </div>
    </Popover>
  )
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const medal = Math.floor(value / 10)
  return (
    <label className="flex flex-col gap-1">
      <span className="label-sm flex items-center justify-between">
        <span>{label}</span>
        <span className="font-mono tnum text-text">{rankTierLabel(value)}</span>
      </span>
      <input
        type="range"
        min={MIN_TIER}
        max={MAX_TIER}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-link"
      />
      <span className="text-[10px] text-ghost">
        {RANK_TIER_NAMES[medal] ?? 'Unknown'}
      </span>
    </label>
  )
}
