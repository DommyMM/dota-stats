import type { Hero } from '../api/types'

export function heroShortName(hero: Hero | undefined): string {
  return hero?.localized_name ?? '?'
}

export function heroByIdMap(heroes: Hero[] | undefined): Map<number, Hero> {
  const m = new Map<number, Hero>()
  if (!heroes) return m
  for (const h of heroes) m.set(h.hero_id, h)
  return m
}

export function impColor(imp: number | null): string {
  if (imp == null) return 'text-ghost'
  if (imp >= 30) return 'text-radiant'
  if (imp >= 10) return 'text-link'
  if (imp >= -10) return 'text-text'
  if (imp >= -30) return 'text-gold'
  return 'text-dire'
}

export function heroIconUrl(hero: Hero | undefined): string | null {
  if (!hero) return null
  // Hero names come back as "npc_dota_hero_<slug>" from OpenDota /constants/heroes.
  const slug = hero.name.replace(/^npc_dota_hero_/, '')
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${slug}.png`
}

export function itemIconUrl(itemName: string | undefined): string | null {
  if (!itemName) return null
  const slug = itemName.replace(/^item_/, '')
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${slug}.png`
}

export function abilityIconUrl(abilityName: string | undefined): string | null {
  if (!abilityName) return null
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${abilityName}.png`
}

export function fmtGameTime(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  const sign = seconds < 0 ? '-' : ''
  const s = Math.abs(Math.round(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${sign}${m}:${r.toString().padStart(2, '0')}`
}
