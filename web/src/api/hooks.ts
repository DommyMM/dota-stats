import { useQuery } from '@tanstack/react-query'
import { apiGet, filterToParams } from './client'
import type {
  Ability,
  Account,
  ActivityDay,
  Health,
  Hero,
  HeroStat,
  Item,
  Match,
  MatchDetail,
  MatchFilterState,
  Summary,
  TeammateStat,
} from './types'

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiGet<Health>('/health'),
    refetchInterval: 15_000,
  })
}

export function useMatches(filter: MatchFilterState) {
  return useQuery({
    queryKey: ['matches', filter],
    queryFn: async () => {
      const params = filterToParams(filter, { includePaging: true })
      const res = await apiGet<{ matches: Match[] }>('/api/matches', params)
      return res.matches
    },
    placeholderData: (prev) => prev,
  })
}

export function useSummary(filter: MatchFilterState) {
  return useQuery({
    queryKey: ['summary', filter],
    queryFn: () => apiGet<Summary>('/api/matches/summary', filterToParams(filter)),
    placeholderData: (prev) => prev,
  })
}

export function useMatchDetail(matchId: number | null) {
  return useQuery({
    queryKey: ['match-detail', matchId],
    queryFn: () => apiGet<MatchDetail>(`/api/matches/${matchId}`),
    enabled: matchId != null,
  })
}

export function useHeroStats(filter: MatchFilterState, limit = 50) {
  return useQuery({
    queryKey: ['stats-heroes', filter, limit],
    queryFn: async () => {
      const params = filterToParams(filter, { extra: { limit } })
      const res = await apiGet<{ heroes: HeroStat[] }>('/api/stats/heroes', params)
      return res.heroes
    },
    placeholderData: (prev) => prev,
  })
}

export function useTeammateStats(filter: MatchFilterState, limit = 30, min_games = 3) {
  return useQuery({
    queryKey: ['stats-teammates', filter, limit, min_games],
    queryFn: async () => {
      const params = filterToParams(filter, { extra: { limit, min_games } })
      const res = await apiGet<{ teammates: TeammateStat[] }>('/api/stats/teammates', params)
      return res.teammates
    },
    placeholderData: (prev) => prev,
  })
}

export function useActivity(filter: MatchFilterState, days = 180) {
  return useQuery({
    queryKey: ['stats-activity', filter, days],
    queryFn: async () => {
      const params = filterToParams(filter, { extra: { days } })
      const res = await apiGet<{ days: ActivityDay[] }>('/api/stats/activity', params)
      return res.days
    },
    placeholderData: (prev) => prev,
  })
}

export function useHeroes() {
  return useQuery({
    queryKey: ['meta-heroes'],
    queryFn: () => apiGet<Hero[]>('/api/meta/heroes'),
    staleTime: Infinity,
  })
}

export function useItems() {
  return useQuery({
    queryKey: ['meta-items'],
    queryFn: () => apiGet<Item[]>('/api/meta/items'),
    staleTime: Infinity,
  })
}

export function useAbilities() {
  return useQuery({
    queryKey: ['meta-abilities'],
    queryFn: () => apiGet<Ability[]>('/api/meta/abilities'),
    staleTime: Infinity,
  })
}

export function useAccounts(tracked?: number, min_matches = 1) {
  return useQuery({
    queryKey: ['meta-accounts', tracked, min_matches],
    queryFn: () => {
      const params = new URLSearchParams({ min_matches: String(min_matches) })
      if (tracked != null) params.set('tracked', String(tracked))
      return apiGet<Account[]>('/api/meta/accounts', params)
    },
    staleTime: 60_000,
  })
}
