import { Swords } from 'lucide-react'
import clsx from 'clsx'
import { useHealth } from '../../api/hooks'
import { AccountSwitcher } from './AccountSwitcher'

export function Header() {
  const { data: health, isError } = useHealth()

  return (
    <header className="sticky top-0 z-30 h-12 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-shell items-center gap-4 px-6">
        <div className="flex items-center gap-2 text-text">
          <Swords size={18} className="text-link" />
          <span className="font-semibold tracking-tight">dota-local</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span
            className={clsx(
              'h-2 w-2 rounded-full',
              isError
                ? 'bg-dire'
                : health
                  ? 'bg-radiant animate-pulse-dot'
                  : 'bg-ghost',
            )}
          />
          <span className="text-muted">
            {isError
              ? 'backend unreachable'
              : health
                ? `local · ${health.matches.toLocaleString('en-US')} matches`
                : 'connecting…'}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            className="rounded-md border border-border2 bg-surface2 px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-50"
            disabled
            title="Pull new matches — wired in F6"
          >
            ↻ Pull new
          </button>
          <AccountSwitcher />
        </div>
      </div>
    </header>
  )
}
