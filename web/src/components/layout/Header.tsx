import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Swords } from 'lucide-react'
import clsx from 'clsx'
import { useHealth, useRefreshMatches } from '../../api/hooks'
import { AccountSwitcher } from './AccountSwitcher'

export function Header() {
  const { data: health, isError } = useHealth()
  const refresh = useRefreshMatches()

  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(id)
  }, [toast])

  const pull = () => {
    refresh.mutate(undefined, {
      onSuccess: (r) => {
        setToast({
          text:
            r.total_new === 0
              ? 'Up to date — no new matches'
              : `Pulled ${r.total_new} new match${r.total_new === 1 ? '' : 'es'}`,
          tone: 'ok',
        })
      },
      onError: (e) => setToast({ text: (e as Error).message, tone: 'err' }),
    })
  }

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

        {toast && (
          <span
            className={clsx(
              'rounded-md border px-2 py-0.5 text-[11px] animate-fade-in',
              toast.tone === 'ok'
                ? 'border-radiant/30 bg-radiant/5 text-radiant'
                : 'border-dire/30 bg-dire/5 text-dire',
            )}
          >
            {toast.text}
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={pull}
            disabled={refresh.isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-border2 bg-surface2 px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-50"
            title="Pull new matches for each tracked account"
          >
            {refresh.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            {refresh.isPending ? 'Pulling…' : 'Pull new'}
          </button>
          <AccountSwitcher />
        </div>
      </div>
    </header>
  )
}
