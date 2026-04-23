import { useFilters } from '../../state/filters'
import { POSITION_NAMES } from '../../lib/constants'
import { Chip } from '../ui/Chip'
import { Popover } from '../ui/Popover'

const POSITIONS = [1, 2, 3, 4, 5]

export function PositionChip() {
  const positions = useFilters((s) => s.filter.positions)
  const patch = useFilters((s) => s.patch)
  if (positions.length === 0) return null

  const toggle = (n: number) => {
    const next = positions.includes(n) ? positions.filter((x) => x !== n) : [...positions, n]
    patch({ positions: next })
  }

  const display =
    positions.length === 1
      ? (POSITION_NAMES[positions[0]] ?? `Pos ${positions[0]}`)
      : `${positions.length} positions`

  return (
    <Popover
      trigger={({ toggle: toggleOpen }) => (
        <Chip
          label="Position"
          display={display}
          active
          onClick={toggleOpen}
          onClear={() => patch({ positions: [] })}
        />
      )}
    >
      <div className="flex flex-col p-1">
        {POSITIONS.map((n) => {
          const checked = positions.includes(n)
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
              <span>{POSITION_NAMES[n]}</span>
            </label>
          )
        })}
      </div>
    </Popover>
  )
}
