import { useFilters } from '../../state/filters'
import { Chip } from '../ui/Chip'
import { Popover } from '../ui/Popover'

const SIZES = [1, 2, 3, 4, 5]

function labelFor(size: number): string {
  return size === 1 ? 'Solo' : `Party of ${size}`
}

export function PartySizeChip() {
  const party_sizes = useFilters((s) => s.filter.party_sizes)
  const patch = useFilters((s) => s.patch)
  if (party_sizes.length === 0) return null

  const toggle = (n: number) => {
    const next = party_sizes.includes(n)
      ? party_sizes.filter((x) => x !== n)
      : [...party_sizes, n]
    patch({ party_sizes: next })
  }

  const display =
    party_sizes.length === 1
      ? labelFor(party_sizes[0])
      : `${party_sizes.length} sizes`

  return (
    <Popover
      trigger={({ toggle: toggleOpen }) => (
        <Chip
          label="Party"
          display={display}
          active
          onClick={toggleOpen}
          onClear={() => patch({ party_sizes: [] })}
        />
      )}
    >
      <div className="flex flex-col p-1">
        {SIZES.map((n) => {
          const checked = party_sizes.includes(n)
          return (
            <label
              key={n}
              className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-xs text-muted hover:bg-border2 hover:text-text"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(n)}
                className="accent-link"
              />
              <span>{labelFor(n)}</span>
            </label>
          )
        })}
      </div>
    </Popover>
  )
}
