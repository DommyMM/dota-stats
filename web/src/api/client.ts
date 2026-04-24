import type { MatchFilterState } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiGet<T>(path: string, params?: URLSearchParams): Promise<T> {
  const url = new URL(path, BASE_URL)
  if (params) url.search = params.toString()
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  return parseResponse<T>(res)
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const url = new URL(path, BASE_URL)
  const res = await fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  })
  return parseResponse<T>(res)
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch {
      /* non-json error body */
    }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}

const LIST_FIELDS = [
  'hero_ids',
  'with_accounts',
  'against_accounts',
  'with_hero_ids',
  'against_hero_ids',
  'game_modes',
  'lobby_types',
  'patches',
  'party_sizes',
  'positions',
  'facet_ids',
  'analysis_outcomes',
] as const satisfies readonly (keyof MatchFilterState)[]

const LIST_FIELD_TO_PARAM: Record<(typeof LIST_FIELDS)[number], string> = {
  hero_ids: 'hero_id',
  with_accounts: 'with_account',
  against_accounts: 'against_account',
  with_hero_ids: 'with_hero_id',
  against_hero_ids: 'against_hero_id',
  game_modes: 'game_mode',
  lobby_types: 'lobby_type',
  patches: 'patch',
  party_sizes: 'party_size',
  positions: 'position',
  facet_ids: 'facet_id',
  analysis_outcomes: 'analysis_outcome',
}

type FilterQueryOptions = {
  includePaging?: boolean
  extra?: Record<string, string | number | undefined>
}

export function filterToParams(
  filter: MatchFilterState,
  opts: FilterQueryOptions = {},
): URLSearchParams {
  const params = new URLSearchParams()
  params.set('account_id', String(filter.account_id))

  for (const field of LIST_FIELDS) {
    const values = filter[field] as Array<number | string>
    const name = LIST_FIELD_TO_PARAM[field]
    for (const v of values) params.append(name, String(v))
  }

  if (filter.date_from) params.set('date_from', filter.date_from)
  if (filter.date_to) params.set('date_to', filter.date_to)
  if (filter.duration_min_s != null) params.set('duration_min_s', String(filter.duration_min_s))
  if (filter.duration_max_s != null) params.set('duration_max_s', String(filter.duration_max_s))
  if (filter.rank_tier_min != null) params.set('rank_tier_min', String(filter.rank_tier_min))
  if (filter.rank_tier_max != null) params.set('rank_tier_max', String(filter.rank_tier_max))
  if (filter.result) params.set('result', filter.result)
  if (filter.parsed_only) params.set('parsed_only', 'true')
  if (filter.leaver_only) params.set('leaver_only', 'true')

  if (opts.includePaging) {
    params.set('limit', String(filter.limit))
    params.set('offset', String(filter.offset))
    params.set('order_by', filter.order_by)
    params.set('order_dir', filter.order_dir)
  }

  if (opts.extra) {
    for (const [k, v] of Object.entries(opts.extra)) {
      if (v != null) params.set(k, String(v))
    }
  }

  return params
}
