import { useFilters } from '../../state/filters'
import type { AnalysisOutcome } from '../../api/types'
import { Chip } from '../ui/Chip'
import { Popover } from '../ui/Popover'

const OPTIONS: Array<{ value: AnalysisOutcome; label: string; desc: string }> = [
  { value: 'comeback', label: 'Comeback', desc: 'You came back from a deficit' },
  { value: 'stomped', label: 'Stomp', desc: 'One-sided, no real fight' },
  { value: 'close_game', label: 'Close game', desc: 'Down-to-the-wire finish' },
  { value: 'none', label: 'Normal', desc: "Didn't hit any tag threshold" },
]

const SHORT_LABEL: Record<AnalysisOutcome, string> = {
  comeback: 'Comeback',
  stomped: 'Stomp',
  close_game: 'Close',
  none: 'Normal',
}

export function OutcomeChip() {
  const outcomes = useFilters((s) => s.filter.analysis_outcomes)
  const patch = useFilters((s) => s.patch)

  const toggle = (v: AnalysisOutcome) => {
    const next = outcomes.includes(v) ? outcomes.filter((x) => x !== v) : [...outcomes, v]
    patch({ analysis_outcomes: next })
  }

  const display =
    outcomes.length === 0
      ? null
      : outcomes.length === 1
        ? SHORT_LABEL[outcomes[0]]
        : `${outcomes.length} tags`

  return (
    <Popover
      className="w-[260px] p-1"
      trigger={({ toggle: toggleOpen }) => (
        <Chip
          label="Outcome"
          display={display}
          active={outcomes.length > 0}
          onClick={toggleOpen}
          onClear={() => patch({ analysis_outcomes: [] })}
        />
      )}
    >
      <div className="flex flex-col">
        {OPTIONS.map((o) => {
          const checked = outcomes.includes(o.value)
          return (
            <label
              key={o.value}
              className="flex cursor-pointer items-start gap-2 rounded px-3 py-2 text-xs text-muted hover:bg-border2 hover:text-text"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(o.value)}
                className="mt-0.5 accent-link"
              />
              <span className="flex flex-col leading-tight">
                <span className="text-text">{o.label}</span>
                <span className="text-[10px] text-ghost">{o.desc}</span>
              </span>
            </label>
          )
        })}
      </div>
      <div className="border-t border-border2 px-3 py-2 text-[10px] text-ghost">
        Tags come from Stratz's per-match analysis. Untagged rows hide from the filter.
      </div>
    </Popover>
  )
}
