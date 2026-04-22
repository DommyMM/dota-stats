import { useState } from 'react'
import { ChevronDown, Star, User } from 'lucide-react'
import { useAccounts } from '../../api/hooks'
import { useFilters } from '../../state/filters'
import { Popover } from '../ui/Popover'

export function AccountSwitcher() {
  const accountId = useFilters((s) => s.filter.account_id)
  const setAccountId = useFilters((s) => s.setAccountId)

  // `tracked` here is "co-occurrence pivot", not "show only tracked"; we pass
  // the current me so the ranking is meaningful.
  const { data: accounts } = useAccounts(accountId)
  const tracked = (accounts ?? []).filter((a) => a.tracked)

  return (
    <Popover
      align="end"
      className="w-64 p-1"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 rounded-md border border-border2 bg-surface2 px-3 py-1.5 text-xs hover:border-link/50"
        >
          <Star size={12} className="text-gold" />
          <span className="font-mono tnum text-text">{accountId}</span>
          <ChevronDown size={12} className="text-ghost" />
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col">
          <div className="label-sm px-3 py-2">Tracked accounts</div>
          {tracked.length === 0 && (
            <div className="px-3 py-2 text-xs text-ghost">No tracked accounts yet.</div>
          )}
          {tracked.map((a) => (
            <button
              key={a.account_id}
              type="button"
              onClick={() => {
                setAccountId(a.account_id)
                close()
              }}
              className="flex items-center justify-between gap-3 rounded px-3 py-2 text-xs hover:bg-border2"
            >
              <span className="flex items-center gap-2">
                <Star size={12} className="text-gold" />
                <span className="font-mono tnum text-text">{a.account_id}</span>
              </span>
              <span className="text-ghost tnum">{a.match_count}</span>
            </button>
          ))}
          <div className="border-t border-border2 px-3 py-2">
            <ChangeAccountInput
              onSubmit={(id) => {
                setAccountId(id)
                close()
              }}
            />
          </div>
        </div>
      )}
    </Popover>
  )
}

function ChangeAccountInput({ onSubmit }: { onSubmit: (id: number) => void }) {
  const [raw, setRaw] = useState('')
  const id = Number(raw)
  const valid = Number.isFinite(id) && id > 0
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit(id)
      }}
      className="flex items-center gap-2"
    >
      <User size={12} className="text-ghost" />
      <input
        value={raw}
        onChange={(e) => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
        placeholder="account_id"
        className="w-full bg-transparent font-mono tnum text-xs text-text outline-none placeholder:text-ghost"
        inputMode="numeric"
      />
      <button
        type="submit"
        disabled={!valid}
        className="rounded border border-border2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted hover:border-link hover:text-link disabled:opacity-40"
      >
        Set
      </button>
    </form>
  )
}
