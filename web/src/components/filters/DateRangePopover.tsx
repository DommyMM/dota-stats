import { format, subDays } from 'date-fns'
import { useFilters } from '../../state/filters'
import { Chip } from '../ui/Chip'
import { Popover } from '../ui/Popover'

function toInputValue(iso: string | undefined): string {
  if (!iso) return ''
  return format(new Date(iso), 'yyyy-MM-dd')
}

function toIso(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  if (endOfDay) d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function DateRangePopover() {
  const date_from = useFilters((s) => s.filter.date_from)
  const date_to = useFilters((s) => s.filter.date_to)
  const patch = useFilters((s) => s.patch)

  const active = Boolean(date_from || date_to)
  const label = active
    ? `${toInputValue(date_from) || '…'} → ${toInputValue(date_to) || '…'}`
    : null

  const quick = (days: number) => {
    const to = new Date()
    const from = subDays(to, days)
    patch({ date_from: from.toISOString(), date_to: to.toISOString() })
  }

  return (
    <Popover
      className="w-[320px] p-3"
      trigger={({ toggle }) => (
        <Chip
          label="Date"
          display={label}
          active={active}
          onClick={toggle}
          onClear={() => patch({ date_from: undefined, date_to: undefined })}
        />
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <label className="flex flex-1 flex-col gap-1">
            <span className="label-sm">From</span>
            <input
              type="date"
              value={toInputValue(date_from)}
              onChange={(e) => patch({ date_from: toIso(e.target.value) })}
              className="rounded-md border border-border2 bg-surface px-2 py-1 text-text outline-none focus:border-link"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="label-sm">To</span>
            <input
              type="date"
              value={toInputValue(date_to)}
              onChange={(e) => patch({ date_to: toIso(e.target.value, true) })}
              className="rounded-md border border-border2 bg-surface px-2 py-1 text-text outline-none focus:border-link"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-1">
          {[7, 30, 90, 180].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => quick(d)}
              className="rounded border border-border2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted hover:border-link hover:text-link"
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
    </Popover>
  )
}
