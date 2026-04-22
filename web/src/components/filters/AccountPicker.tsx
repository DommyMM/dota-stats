import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Star } from 'lucide-react'
import { useAccounts } from '../../api/hooks'
import { useFilters } from '../../state/filters'
import { Chip } from '../ui/Chip'
import { Popover } from '../ui/Popover'
import type { MatchFilterState } from '../../api/types'

type AccountField = 'with_accounts' | 'against_accounts'

const LABELS: Record<AccountField, string> = {
  with_accounts: 'With',
  against_accounts: 'Against',
}

export function AccountPicker({ field }: { field: AccountField }) {
  const accountId = useFilters((s) => s.filter.account_id)
  const selected = useFilters((s) => s.filter[field] as MatchFilterState[AccountField])
  const patch = useFilters((s) => s.patch)
  const { data: accounts = [] } = useAccounts(accountId, 1)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) return accounts
    return accounts.filter((a) => String(a.account_id).includes(query))
  }, [accounts, query])

  const toggle = (aid: number) => {
    const next = selected.includes(aid) ? selected.filter((id) => id !== aid) : [...selected, aid]
    patch({ [field]: next } as Partial<MatchFilterState>)
  }

  const label =
    selected.length === 0
      ? null
      : selected.length === 1
        ? String(selected[0])
        : `${selected.length} accounts`

  return (
    <Popover
      className="w-[320px] p-2"
      trigger={({ toggle: toggleOpen }) => (
        <Chip
          label={LABELS[field]}
          display={label}
          active={selected.length > 0}
          onClick={toggleOpen}
          onClear={() => patch({ [field]: [] } as Partial<MatchFilterState>)}
        />
      )}
    >
      <div className="flex flex-col gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="Filter by account_id…"
          className="rounded-md border border-border2 bg-surface px-2 py-1.5 text-xs text-text outline-none focus:border-link"
          inputMode="numeric"
          autoFocus
        />
        <div className="max-h-72 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <div className="py-6 text-center text-xs text-ghost">No accounts.</div>
          )}
          {filtered.map((a) => {
            const active = selected.includes(a.account_id)
            return (
              <button
                key={a.account_id}
                type="button"
                onClick={() => toggle(a.account_id)}
                className={clsx(
                  'flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-xs',
                  active
                    ? 'bg-link/15 text-text ring-1 ring-link'
                    : 'text-muted hover:bg-border2 hover:text-text',
                )}
              >
                <span className="flex items-center gap-2">
                  {a.tracked && <Star size={10} className="text-gold" />}
                  <span className="font-mono tnum">{a.account_id}</span>
                </span>
                <span className="text-ghost tnum">{a.match_count}</span>
              </button>
            )
          })}
        </div>
      </div>
    </Popover>
  )
}
