import { formatDistanceToNowStrict, format } from 'date-fns'

export function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function fmtRelTime(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true })
}

export function fmtDate(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy HH:mm')
}

export function fmtKNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n))
}

export function fmtWR(winrate: number): string {
  return `${(winrate * 100).toFixed(1)}%`
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}
