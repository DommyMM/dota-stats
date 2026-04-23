export type ParseStatus =
  | 'unparsed'
  | 'pending'
  | 'parsed'
  | 'unparseable'
  | 'unavailable'

export type Match = {
  match_id: number
  start_time: string
  duration: number
  game_mode: number
  lobby_type: number
  patch: number | null
  radiant_win: boolean
  avg_rank_tier: number | null
  parse_status: ParseStatus
  region: number | null
  player_slot: number
  account_id: number
  hero_id: number
  is_radiant: boolean
  kills: number
  deaths: number
  assists: number
  gpm: number
  xpm: number
  last_hits: number
  denies: number
  hero_damage: number
  tower_damage: number
  hero_healing: number
  net_worth: number
  level: number
  lane: number | null
  lane_role: number | null
  position: number | null
  facet_id: number | null
  party_id: number | null
  party_size: number | null
  leaver_status: number
  rank_tier: number | null
  imp: number | null
  won: boolean
}

export type Summary = {
  matches: number
  wins: number
  losses: number
  winrate: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  avg_gpm: number
  avg_xpm: number
  avg_imp: number | null
  first_match: string | null
  last_match: string | null
}

export type MatchDetailPlayerItem = {
  slot_idx: number
  item_id: number
  ts_purchased: number | null
}

export type MatchDetailPlayerAbility = {
  ability_id: number
  level: number
  time: number | null
}

export type MatchDetailPlayer = {
  player_slot: number
  account_id: number | null
  hero_id: number
  is_radiant: boolean
  kills: number
  deaths: number
  assists: number
  gpm: number
  xpm: number
  last_hits: number
  denies: number
  hero_damage: number
  tower_damage: number
  hero_healing: number
  net_worth: number
  level: number
  lane: number | null
  lane_role: number | null
  position: number | null
  facet_id: number | null
  party_id: number | null
  party_size: number | null
  leaver_status: number
  rank_tier: number | null
  imp: number | null
  items: MatchDetailPlayerItem[]
  ability_upgrades: MatchDetailPlayerAbility[]
}

export type MatchDetail = {
  match: {
    match_id: number
    start_time: string
    duration: number
    game_mode: number
    lobby_type: number
    patch: number | null
    region: number | null
    radiant_win: boolean
    avg_rank_tier: number | null
    parse_status: ParseStatus
    source: string | null
    replay_url: string | null
  }
  players: MatchDetailPlayer[]
  draft: Array<{
    order_idx: number
    is_pick: boolean | null
    is_radiant: boolean | null
    hero_id: number
    player_slot: number | null
  }>
  objectives: Array<{ time: number; type: string; value: number | null; slot: number | null }>
  chat: Array<{ time: number; slot: number; type: string; text: string }>
  teamfights: Array<{ start_ts: number; end_ts: number; deaths: number }>
}

export type HeroStat = {
  hero_id: number
  games: number
  wins: number
  winrate: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  avg_gpm: number
  avg_xpm: number
  avg_imp: number | null
}

export type TeammateStat = {
  account_id: number
  games: number
  wins: number
  winrate: number
  tracked: boolean
}

export type ActivityDay = {
  day: string
  games: number
  wins: number
}

export type Hero = {
  hero_id: number
  name: string
  localized_name: string
  primary_attr: string
  roles: string[]
  facets: unknown[]
}

export type Item = { item_id: number; name: string; cost: number | null }

export type Ability = { ability_id: number; name: string; is_ultimate: boolean }

export type Account = { account_id: number; match_count: number; tracked: boolean }

export type Health = {
  status: string
  version: string
  matches: number
  parsed: number
  tracked_players: number
}

export type OrderBy =
  | 'start_time'
  | 'duration'
  | 'kills'
  | 'deaths'
  | 'assists'
  | 'gpm'
  | 'xpm'
  | 'net_worth'
  | 'imp'
export type OrderDir = 'asc' | 'desc'
export type ResultFilter = 'win' | 'loss'

export type MatchFilterState = {
  account_id: number
  hero_ids: number[]
  with_accounts: number[]
  against_accounts: number[]
  with_hero_ids: number[]
  against_hero_ids: number[]
  game_modes: number[]
  lobby_types: number[]
  patches: number[]
  party_sizes: number[]
  positions: number[]
  facet_ids: number[]
  date_from?: string
  date_to?: string
  duration_min_s?: number
  duration_max_s?: number
  rank_tier_min?: number
  rank_tier_max?: number
  result?: ResultFilter
  parsed_only: boolean
  leaver_only: boolean
  limit: number
  offset: number
  order_by: OrderBy
  order_dir: OrderDir
}
