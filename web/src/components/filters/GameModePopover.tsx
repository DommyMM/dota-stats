import { useFilters } from '../../state/filters'
import { GAME_MODE_NAMES } from '../../lib/constants'
import { Chip } from '../ui/Chip'
import { Popover } from '../ui/Popover'

const COMMON_MODES = [23, 22, 2, 5, 4, 3, 1]

export function GameModePopover() {
  const game_modes = useFilters((s) => s.filter.game_modes)
  const patch = useFilters((s) => s.patch)

  const toggle = (id: number) => {
    const next = game_modes.includes(id)
      ? game_modes.filter((m) => m !== id)
      : [...game_modes, id]
    patch({ game_modes: next })
  }

  const label =
    game_modes.length === 0
      ? null
      : game_modes.length === 1
        ? (GAME_MODE_NAMES[game_modes[0]] ?? String(game_modes[0]))
        : `${game_modes.length} modes`

  return (
    <Popover
      trigger={({ toggle: toggleOpen }) => (
        <Chip
          label="Mode"
          display={label}
          active={game_modes.length > 0}
          onClick={toggleOpen}
          onClear={() => patch({ game_modes: [] })}
        />
      )}
    >
      <div className="flex flex-col p-1">
        {COMMON_MODES.map((id) => {
          const checked = game_modes.includes(id)
          return (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-xs text-muted hover:bg-border2 hover:text-text"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(id)}
                className="accent-link"
              />
              <span>{GAME_MODE_NAMES[id] ?? `Mode ${id}`}</span>
            </label>
          )
        })}
      </div>
    </Popover>
  )
}
