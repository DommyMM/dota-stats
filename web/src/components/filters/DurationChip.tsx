import { useFilters } from '../../state/filters'
import { Chip } from '../ui/Chip'
import { Popover } from '../ui/Popover'

const MIN = 0
const MAX = 60 * 60 // 60 minutes in seconds

function fmtMin(s: number | undefined): string {
  if (s == null) return '—'
  return `${Math.round(s / 60)}m`
}

export function DurationChip() {
  const duration_min_s = useFilters((s) => s.filter.duration_min_s)
  const duration_max_s = useFilters((s) => s.filter.duration_max_s)
  const patch = useFilters((s) => s.patch)

  const active = duration_min_s != null || duration_max_s != null
  if (!active) return null

  const label = `${fmtMin(duration_min_s)} – ${fmtMin(duration_max_s)}`

  return (
    <Popover
      className="w-[260px] p-3"
      trigger={({ toggle }) => (
        <Chip
          label="Duration"
          display={label}
          active
          onClick={toggle}
          onClear={() => patch({ duration_min_s: undefined, duration_max_s: undefined })}
        />
      )}
    >
      <div className="flex flex-col gap-3 text-xs">
        <SliderRow
          label="Min"
          value={duration_min_s ?? MIN}
          onChange={(v) => patch({ duration_min_s: v })}
        />
        <SliderRow
          label="Max"
          value={duration_max_s ?? MAX}
          onChange={(v) => patch({ duration_max_s: v })}
        />
      </div>
    </Popover>
  )
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label-sm flex items-center justify-between">
        <span>{label}</span>
        <span className="font-mono tnum text-text">{Math.round(value / 60)}m</span>
      </span>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={60}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-link"
      />
    </label>
  )
}
