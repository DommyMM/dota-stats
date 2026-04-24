import type { AnalysisOutcome, MatchFilterState, OrderBy, OrderDir, ResultFilter } from './types'

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

const PARAM_TO_LIST_FIELD: Record<string, (typeof LIST_FIELDS)[number]> = Object
  .fromEntries(
    (Object.entries(LIST_FIELD_TO_PARAM) as Array<[(typeof LIST_FIELDS)[number], string]>)
      .map(([field, param]) => [param, field]),
  )

const STRING_LIST_FIELDS: ReadonlySet<(typeof LIST_FIELDS)[number]> = new Set([
  'analysis_outcomes',
])

const VALID_OUTCOMES: ReadonlySet<AnalysisOutcome> = new Set([
  'none',
  'stomped',
  'comeback',
  'close_game',
])
const VALID_ORDER_BY: ReadonlySet<OrderBy> = new Set([
  'start_time',
  'duration',
  'kills',
  'deaths',
  'assists',
  'gpm',
  'xpm',
  'net_worth',
  'imp',
])

/**
 * Parse a URLSearchParams (or URL query string) into a partial
 * MatchFilterState. Unknown keys are ignored; malformed values are
 * dropped silently so deep links from older schemas don't blow up.
 *
 * Returns `null` if the URL doesn't appear to describe a filter
 * (no recognized params at all) so callers can decide whether to
 * fall back to the persisted default.
 */
export function paramsToFilter(
  search: URLSearchParams | string,
): Partial<MatchFilterState> | null {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const out: Partial<MatchFilterState> = {}
  let hit = false

  const accountRaw = params.get('account_id')
  if (accountRaw) {
    const n = Number(accountRaw)
    if (Number.isFinite(n) && n > 0) {
      out.account_id = n
      hit = true
    }
  }

  // List fields — repeated params.
  for (const [paramName, field] of Object.entries(PARAM_TO_LIST_FIELD)) {
    const values = params.getAll(paramName)
    if (values.length === 0) continue
    hit = true
    if (STRING_LIST_FIELDS.has(field)) {
      // Currently only analysis_outcomes. Validate against enum.
      const parsed = values.filter((v): v is AnalysisOutcome =>
        VALID_OUTCOMES.has(v as AnalysisOutcome),
      )
      ;(out as Record<string, unknown>)[field] = parsed
    } else {
      const nums = values
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n))
      ;(out as Record<string, unknown>)[field] = nums
    }
  }

  const scalarNum = (key: keyof MatchFilterState, paramKey = key as string) => {
    const raw = params.get(paramKey)
    if (raw == null) return
    const n = Number(raw)
    if (Number.isFinite(n)) {
      ;(out as Record<string, unknown>)[key as string] = n
      hit = true
    }
  }
  scalarNum('duration_min_s')
  scalarNum('duration_max_s')
  scalarNum('rank_tier_min')
  scalarNum('rank_tier_max')
  scalarNum('limit')
  scalarNum('offset')

  const dateFrom = params.get('date_from')
  if (dateFrom) {
    out.date_from = dateFrom
    hit = true
  }
  const dateTo = params.get('date_to')
  if (dateTo) {
    out.date_to = dateTo
    hit = true
  }

  const result = params.get('result')
  if (result === 'win' || result === 'loss') {
    out.result = result as ResultFilter
    hit = true
  }

  const orderBy = params.get('order_by')
  if (orderBy && VALID_ORDER_BY.has(orderBy as OrderBy)) {
    out.order_by = orderBy as OrderBy
    hit = true
  }
  const orderDir = params.get('order_dir')
  if (orderDir === 'asc' || orderDir === 'desc') {
    out.order_dir = orderDir as OrderDir
    hit = true
  }

  if (params.get('parsed_only') === 'true') {
    out.parsed_only = true
    hit = true
  }
  if (params.get('leaver_only') === 'true') {
    out.leaver_only = true
    hit = true
  }

  return hit ? out : null
}
