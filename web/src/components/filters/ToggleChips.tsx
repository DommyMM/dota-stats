import { useFilters } from '../../state/filters'
import { Chip } from '../ui/Chip'

export function ParsedOnlyChip() {
  const parsed_only = useFilters((s) => s.filter.parsed_only)
  const patch = useFilters((s) => s.patch)
  if (!parsed_only) return null
  return (
    <Chip
      label="Parsed"
      display="Only"
      active
      onClick={() => patch({ parsed_only: false })}
      onClear={() => patch({ parsed_only: false })}
    />
  )
}

export function LeaverOnlyChip() {
  const leaver_only = useFilters((s) => s.filter.leaver_only)
  const patch = useFilters((s) => s.patch)
  if (!leaver_only) return null
  return (
    <Chip
      label="Leaver"
      display="Only"
      active
      onClick={() => patch({ leaver_only: false })}
      onClear={() => patch({ leaver_only: false })}
    />
  )
}
