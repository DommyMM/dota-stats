import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { FilterBar } from './FilterBar'
import { HeroStatsPanel } from '../panels/HeroStatsPanel'
import { TeammatesPanel } from '../panels/TeammatesPanel'
import { ActivityHeatmap } from '../panels/ActivityHeatmap'
import { useFilterUrlSync } from '../../state/urlSync'

export function AppShell() {
  const location = useLocation()
  // Two-way ?query ↔ filter state sync. Bookmarks, deep links, and the
  // back button all work as expected.
  useFilterUrlSync()
  // Right rail is the stats panels — only meaningful on the matches list.
  const showRail = location.pathname === '/'

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <FilterBar />
      <div className="mx-auto max-w-shell px-6 py-6">
        {showRail ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-w-0">
              <Outlet />
            </main>
            <aside className="hidden xl:flex xl:flex-col xl:gap-4">
              <HeroStatsPanel />
              <TeammatesPanel />
              <ActivityHeatmap />
            </aside>
          </div>
        ) : (
          <main>
            <Outlet />
          </main>
        )}
      </div>
    </div>
  )
}
