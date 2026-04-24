import clsx from 'clsx'
import type { AnalysisOutcome } from '../../api/types'

const TONE: Record<AnalysisOutcome, string> = {
  comeback: 'border-link/40 bg-link/10 text-link',
  stomped: 'border-gold/40 bg-gold/10 text-gold',
  close_game: 'border-xp/40 bg-xp/10 text-xp',
  none: 'border-border2 bg-surface2/50 text-ghost',
}

const LABEL: Record<AnalysisOutcome, string> = {
  comeback: 'Comeback',
  stomped: 'Stomp',
  close_game: 'Close',
  none: 'Normal',
}

export function OutcomeBadge({
  outcome,
  size = 'sm',
  muteNormal = true,
}: {
  outcome: AnalysisOutcome | null | undefined
  size?: 'sm' | 'md'
  // Hide the 'Normal' label in dense contexts (table rows) — it's noise.
  muteNormal?: boolean
}) {
  if (!outcome) return null
  if (muteNormal && outcome === 'none') return null
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded border px-1.5 uppercase tracking-wide',
        size === 'sm' ? 'py-[1px] text-[9px]' : 'py-0.5 text-[10px]',
        TONE[outcome],
      )}
    >
      {LABEL[outcome]}
    </span>
  )
}
