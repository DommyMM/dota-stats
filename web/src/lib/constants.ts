export const DEFAULT_ACCOUNT_ID = 231869198
export const ACCOUNT_STORAGE_KEY = 'dota-local:account_id'

export const GAME_MODE_NAMES: Record<number, string> = {
  0: 'Unknown',
  1: 'All Pick',
  2: 'Captains Mode',
  3: 'Random Draft',
  4: 'Single Draft',
  5: 'All Random',
  22: 'All Draft',
  23: 'Turbo',
}

export const LOBBY_TYPE_NAMES: Record<number, string> = {
  0: 'Normal',
  1: 'Practice',
  2: 'Tournament',
  5: 'Team',
  6: 'Tutorial',
  7: 'Co-op Bots',
  9: '1v1 Mid',
  14: 'Ability Draft',
}

export const POSITION_NAMES: Record<number, string> = {
  1: 'Carry',
  2: 'Mid',
  3: 'Offlane',
  4: 'Soft Support',
  5: 'Hard Support',
}

export const LANE_NAMES: Record<number, string> = {
  1: 'Safe',
  2: 'Mid',
  3: 'Off',
  4: 'Roam',
  5: 'Jungle',
}

export const RANK_TIER_NAMES: Record<number, string> = {
  1: 'Herald',
  2: 'Guardian',
  3: 'Crusader',
  4: 'Archon',
  5: 'Legend',
  6: 'Ancient',
  7: 'Divine',
  8: 'Immortal',
}

export function rankTierLabel(tier: number | null): string {
  if (tier == null) return '—'
  const medal = Math.floor(tier / 10)
  const stars = tier % 10
  const name = RANK_TIER_NAMES[medal] ?? '—'
  return stars ? `${name} ${stars}` : name
}
