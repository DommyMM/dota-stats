import { useFilters } from '../../state/filters'
import type { ResultFilter } from '../../api/types'
import { Chip } from '../ui/Chip'
import { Popover } from '../ui/Popover'

const OPTIONS: Array<{ label: string; value: ResultFilter | null }> = [
  { label: 'Any', value: null },
  { label: 'Win', value: 'win' },
  { label: 'Loss', value: 'loss' },
]

export function ResultChip() {
  const result = useFilters((s) => s.filter.result)
  const patch = useFilters((s) => s.patch)

  return (
    <Popover
      trigger={({ toggle }) => (
        <Chip
          label="Result"
          display={result ? (result === 'win' ? 'Win' : 'Loss') : null}
          active={Boolean(result)}
          onClick={toggle}
          onClear={() => patch({ result: undefined })}
        />
      )}
    >
      {(close) => (
        <div className="flex flex-col p-1">
          {OPTIONS.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => {
                patch({ result: o.value ?? undefined })
                close()
              }}
              className="rounded px-3 py-2 text-left text-xs text-muted hover:bg-border2 hover:text-text"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  )
}
