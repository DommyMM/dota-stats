import { Plus } from 'lucide-react'
import { useFilters } from '../../state/filters'
import { Popover } from '../ui/Popover'
import type { MatchFilterState } from '../../api/types'

type Entry = {
  key: string
  label: string
  active: (f: MatchFilterState) => boolean
  // Sensible defaults so the chip immediately activates + appears in the bar.
  defaults: Partial<MatchFilterState>
}

const ENTRIES: Entry[] = [
  {
    key: 'duration',
    label: 'Duration',
    active: (f) => f.duration_min_s != null || f.duration_max_s != null,
    // 10–40 min covers most turbo games without being overly aggressive.
    defaults: { duration_min_s: 600, duration_max_s: 2400 },
  },
  {
    key: 'party',
    label: 'Party size',
    active: (f) => f.party_sizes.length > 0,
    defaults: { party_sizes: [3] },
  },
  {
    key: 'position',
    label: 'Position',
    active: (f) => f.positions.length > 0,
    defaults: { positions: [2] }, // mid
  },
  {
    key: 'rank',
    label: 'Rank range',
    active: (f) => f.rank_tier_min != null || f.rank_tier_max != null,
    // Ancient → Immortal
    defaults: { rank_tier_min: 61, rank_tier_max: 80 },
  },
  {
    key: 'parsed',
    label: 'Parsed only',
    active: (f) => f.parsed_only,
    defaults: { parsed_only: true },
  },
  {
    key: 'leaver',
    label: 'Leaver only',
    active: (f) => f.leaver_only,
    defaults: { leaver_only: true },
  },
]

export function AddFilterMenu() {
  const filter = useFilters((s) => s.filter)
  const patchFn = useFilters((s) => s.patch)

  const inactive = ENTRIES.filter((e) => !e.active(filter))
  if (inactive.length === 0) return null

  return (
    <Popover
      align="end"
      className="w-48 p-1"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-border2 px-2.5 py-1 text-xs text-muted hover:border-link hover:text-link"
        >
          <Plus size={12} /> Add filter
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col">
          <div className="label-sm px-3 py-2">More filters</div>
          {inactive.map((e) => (
            <button
              key={e.key}
              type="button"
              onClick={() => {
                patchFn(e.defaults)
                close()
              }}
              className="rounded px-3 py-2 text-left text-xs text-muted hover:bg-border2 hover:text-text"
            >
              {e.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  )
}
