import { create } from 'zustand'

export type Density = 'comfortable' | 'compact'

type UIStore = {
  density: Density
  setDensity: (d: Density) => void
  columnVisibility: Record<string, boolean>
  setColumnVisibility: (next: Record<string, boolean>) => void
}

const DENSITY_KEY = 'dota-local:density'
const COLS_KEY = 'dota-local:columns'

function loadDensity(): Density {
  if (typeof window === 'undefined') return 'comfortable'
  const raw = window.localStorage.getItem(DENSITY_KEY)
  return raw === 'compact' ? 'compact' : 'comfortable'
}

function loadColumns(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(COLS_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

export const useUI = create<UIStore>((set) => ({
  density: loadDensity(),
  setDensity: (density) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(DENSITY_KEY, density)
    set({ density })
  },
  columnVisibility: loadColumns(),
  setColumnVisibility: (next) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(COLS_KEY, JSON.stringify(next))
    set({ columnVisibility: next })
  },
}))
