import { useEffect, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'

type PopoverProps = {
  trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'start' | 'end'
  className?: string
}

export function Popover({ trigger, children, align = 'start', className }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)
  const toggle = () => setOpen((v) => !v)

  return (
    <div ref={rootRef} className="relative inline-block">
      {trigger({ open, toggle })}
      {open && (
        <div
          className={clsx(
            'absolute top-full z-40 mt-1 min-w-[240px] rounded-lg border border-border2 bg-surface2 shadow-xl animate-fade-in',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  )
}
