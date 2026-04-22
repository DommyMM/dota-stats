import { SummaryStrip } from '../components/match-list/SummaryStrip'
import { MatchTable } from '../components/match-list/MatchTable'

export function MatchesPage() {
  return (
    <div className="space-y-5">
      <SummaryStrip />
      <MatchTable />
    </div>
  )
}
