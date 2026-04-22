import { Plus } from 'lucide-react'

export function FilterBar() {
  return (
    <div className="sticky top-12 z-20 h-11 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-shell items-center gap-2 px-6">
        <span className="label-sm">Filters</span>
        <span className="text-xs text-ghost">No filters applied — F1 wires up chip popovers.</span>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-dashed border-border2 px-2.5 py-1 text-xs text-muted hover:border-link hover:text-link"
          disabled
        >
          <Plus size={12} /> Add filter
        </button>
      </div>
    </div>
  )
}
