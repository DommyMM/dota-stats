import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { FilterBar } from './FilterBar'

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <FilterBar />
      <main className="mx-auto max-w-shell px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
