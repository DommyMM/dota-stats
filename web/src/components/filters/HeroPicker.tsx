import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { useHeroes } from '../../api/hooks'
import { useFilters } from '../../state/filters'
import { Chip } from '../ui/Chip'
import { Popover } from '../ui/Popover'
import { HeroIcon } from '../assets/HeroIcon'
import type { MatchFilterState } from '../../api/types'

type HeroField = 'hero_ids' | 'with_hero_ids' | 'against_hero_ids'

const LABELS: Record<HeroField, string> = {
  hero_ids: 'My hero',
  with_hero_ids: 'Ally hero',
  against_hero_ids: 'Enemy hero',
}

export function HeroPicker({ field }: { field: HeroField }) {
  const selected = useFilters((s) => s.filter[field] as MatchFilterState[HeroField])
  const patch = useFilters((s) => s.patch)
  const { data: heroes = [] } = useHeroes()
  const [query, setQuery] = useState('')

  const byId = useMemo(() => {
    const m = new Map<number, (typeof heroes)[number]>()
    for (const h of heroes) m.set(h.hero_id, h)
    return m
  }, [heroes])

  const filtered = useMemo(() => {
    if (!query) return heroes
    const q = query.toLowerCase()
    return heroes.filter((h) => h.localized_name.toLowerCase().includes(q))
  }, [heroes, query])

  const toggle = (hero_id: number) => {
    const next = selected.includes(hero_id)
      ? selected.filter((id) => id !== hero_id)
      : [...selected, hero_id]
    patch({ [field]: next } as Partial<MatchFilterState>)
  }

  const label =
    selected.length === 0
      ? null
      : selected.length === 1
        ? (byId.get(selected[0])?.localized_name ?? String(selected[0]))
        : `${selected.length} heroes`

  return (
    <Popover
      className="w-[560px] p-3"
      trigger={({ toggle: toggleOpen }) => (
        <Chip
          label={LABELS[field]}
          display={label}
          active={selected.length > 0}
          onClick={toggleOpen}
          onClear={() => patch({ [field]: [] } as Partial<MatchFilterState>)}
        />
      )}
    >
      <div className="flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search heroes…"
          className="rounded-md border border-border2 bg-surface px-2 py-1.5 text-xs text-text outline-none focus:border-link"
          autoFocus
        />
        <div className="grid max-h-80 grid-cols-7 gap-1 overflow-y-auto pr-1">
          {filtered.map((h) => {
            const active = selected.includes(h.hero_id)
            return (
              <button
                key={h.hero_id}
                type="button"
                onClick={() => toggle(h.hero_id)}
                className={clsx(
                  'flex flex-col items-center gap-1 rounded p-1 text-[10px] transition-colors',
                  active
                    ? 'bg-link/15 text-text ring-1 ring-link'
                    : 'text-muted hover:bg-border2 hover:text-text',
                )}
                title={h.localized_name}
              >
                <HeroIcon hero={h} size="md" />
                <span className="w-full truncate text-center">{h.localized_name}</span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-7 py-6 text-center text-xs text-ghost">No matches.</div>
          )}
        </div>
      </div>
    </Popover>
  )
}
