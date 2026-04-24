import { create } from 'zustand'
import type { MatchFilterState } from '../api/types'
import { ACCOUNT_STORAGE_KEY, DEFAULT_ACCOUNT_ID } from '../lib/constants'

function loadAccountId(): number {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNT_ID
  const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY)
  if (!raw) return DEFAULT_ACCOUNT_ID
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ACCOUNT_ID
}

function emptyFilter(account_id: number): MatchFilterState {
  return {
    account_id,
    hero_ids: [],
    with_accounts: [],
    against_accounts: [],
    with_hero_ids: [],
    against_hero_ids: [],
    game_modes: [],
    lobby_types: [],
    patches: [],
    party_sizes: [],
    positions: [],
    facet_ids: [],
    analysis_outcomes: [],
    parsed_only: false,
    leaver_only: false,
    limit: 100,
    offset: 0,
    order_by: 'start_time',
    order_dir: 'desc',
  }
}

type FiltersStore = {
  filter: MatchFilterState
  setAccountId: (account_id: number) => void
  patch: (p: Partial<MatchFilterState>) => void
  reset: () => void
}

export const useFilters = create<FiltersStore>((set, get) => ({
  filter: emptyFilter(loadAccountId()),
  setAccountId: (account_id) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCOUNT_STORAGE_KEY, String(account_id))
    }
    // Switching account wipes the rest of the filter — it references that
    // person's matches, so keeping prior selections would be nonsense.
    set({ filter: emptyFilter(account_id) })
  },
  patch: (p) => set({ filter: { ...get().filter, ...p, offset: 0 } }),
  reset: () => set({ filter: emptyFilter(get().filter.account_id) }),
}))
