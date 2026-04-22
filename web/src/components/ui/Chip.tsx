import clsx from 'clsx'
import { X } from 'lucide-react'
import type { ButtonHTMLAttributes, MouseEvent } from 'react'

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & {
  active?: boolean
  onClear?: () => void
  label: string
  display?: string | null
}

export function Chip({ active, onClear, label, display, className, ...rest }: ChipProps) {
  const handleClear = (e: MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation()
    onClear?.()
  }
  return (
    <button
      type="button"
      className={clsx(
        'group inline-flex h-7 items-center gap-1.5 rounded-md border px-3 text-xs transition-colors',
        active
          ? 'border-l-2 border-l-link border-border2 bg-surface2 text-text'
          : 'border-border2 bg-surface2 text-muted hover:text-text',
        className,
      )}
      {...rest}
    >
      <span className="text-ghost">{label}:</span>
      <span className={active ? 'text-text' : 'text-muted'}>{display ?? 'Any'}</span>
      {active && onClear && (
        <span
          role="button"
          onClick={handleClear}
          className="ml-0.5 rounded-sm p-0.5 text-ghost hover:bg-border2 hover:text-dire"
          aria-label={`Clear ${label}`}
        >
          <X size={10} />
        </span>
      )}
    </button>
  )
}
