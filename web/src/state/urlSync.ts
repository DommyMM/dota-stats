import { useEffect, useRef } from 'react'
import { filterToParams, paramsToFilter } from '../api/client'
import type { MatchFilterState } from '../api/types'
import { useFilters } from './filters'

function writeUrl(filter: MatchFilterState) {
  // Include paging so ?order_by/order_dir/limit round-trip; skip offset
  // when it's 0 to keep URLs clean on first page.
  const params = filterToParams(filter, { includePaging: true })
  if (filter.offset === 0) params.delete('offset')
  if (filter.limit === 100) params.delete('limit')
  const qs = params.toString()
  const current = window.location.search.replace(/^\?/, '')
  if (qs === current) return
  const target = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
  window.history.replaceState(null, '', target)
}

/**
 * Two-way sync between the Zustand filter store and ?query_string:
 *   - On mount (and on popstate) read URL → patch store.
 *   - On filter change, debounce-push the store → replaceState.
 *
 * Bookmarks and the browser back/forward buttons both work. Manual URL
 * edits from the address bar also apply because the hook re-reads on
 * popstate (triggered by hash/url changes the user drives).
 */
export function useFilterUrlSync(): void {
  const filter = useFilters((s) => s.filter)
  const setAccountId = useFilters((s) => s.setAccountId)
  const patchFn = useFilters((s) => s.patch)
  // Guard against echoing the very URL we just wrote.
  const lastWritten = useRef<string>('')

  // Hydrate from URL (and keep listening for back/forward).
  useEffect(() => {
    const hydrate = () => {
      const parsed = paramsToFilter(window.location.search)
      if (!parsed) return
      // account_id drives a full reset in the store, so pull it out first.
      if (parsed.account_id && parsed.account_id !== useFilters.getState().filter.account_id) {
        setAccountId(parsed.account_id)
        // After reset we still want to apply the rest of the URL filters.
      }
      // Strip undefined/empty keys to avoid clobbering the store defaults
      // with explicit-false values that weren't actually in the URL.
      const { account_id: _, ...rest } = parsed
      if (Object.keys(rest).length > 0) {
        patchFn(rest as Partial<MatchFilterState>)
      }
    }

    hydrate()
    const onPop = () => hydrate()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [setAccountId, patchFn])

  // Debounce store → URL. 200ms feels instant while slider drags don't
  // thrash history.
  useEffect(() => {
    const id = window.setTimeout(() => {
      writeUrl(filter)
      lastWritten.current = window.location.search
    }, 200)
    return () => window.clearTimeout(id)
  }, [filter])
}
