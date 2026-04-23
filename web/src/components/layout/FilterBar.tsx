import { useFilters } from '../../state/filters'
import { ResultChip } from '../filters/ResultChip'
import { GameModePopover } from '../filters/GameModePopover'
import { HeroPicker } from '../filters/HeroPicker'
import { AccountPicker } from '../filters/AccountPicker'
import { DateRangePopover } from '../filters/DateRangePopover'
import { DurationChip } from '../filters/DurationChip'
import { PartySizeChip } from '../filters/PartySizeChip'
import { PositionChip } from '../filters/PositionChip'
import { RankRangeChip } from '../filters/RankRangeChip'
import { ParsedOnlyChip, LeaverOnlyChip } from '../filters/ToggleChips'
import { AddFilterMenu } from '../filters/AddFilterMenu'

function anyFilterActive(f: ReturnType<typeof useFilters.getState>['filter']): boolean {
  return (
    f.result !== undefined ||
    f.hero_ids.length > 0 ||
    f.with_accounts.length > 0 ||
    f.against_accounts.length > 0 ||
    f.with_hero_ids.length > 0 ||
    f.against_hero_ids.length > 0 ||
    f.game_modes.length > 0 ||
    f.lobby_types.length > 0 ||
    f.patches.length > 0 ||
    f.party_sizes.length > 0 ||
    f.positions.length > 0 ||
    f.facet_ids.length > 0 ||
    f.date_from !== undefined ||
    f.date_to !== undefined ||
    f.duration_min_s !== undefined ||
    f.duration_max_s !== undefined ||
    f.rank_tier_min !== undefined ||
    f.rank_tier_max !== undefined ||
    f.parsed_only ||
    f.leaver_only
  )
}

export function FilterBar() {
  const filter = useFilters((s) => s.filter)
  const reset = useFilters((s) => s.reset)
  const hasAny = anyFilterActive(filter)

  return (
    <div className="sticky top-12 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-shell flex-wrap items-center gap-2 px-6 py-2">
        <ResultChip />
        <GameModePopover />
        <HeroPicker field="hero_ids" />
        <AccountPicker field="with_accounts" />
        <AccountPicker field="against_accounts" />
        <DateRangePopover />

        {/* Secondary chips render when active (set via Add filter menu). */}
        <DurationChip />
        <PartySizeChip />
        <PositionChip />
        <RankRangeChip />
        <ParsedOnlyChip />
        <LeaverOnlyChip />

        <AddFilterMenu />

        {hasAny && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto text-xs text-ghost hover:text-dire"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
