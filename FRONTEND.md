# Frontend Spec — `dota-local` web UI

Self-contained spec for building the [web/](web/) frontend in parallel with backend work. A parallel Claude instance should be able to execute this without asking the human any questions.

---

## 0. Context in one paragraph

`dota-local` is a **local-only, single-user Dota 2 analytics tool** for the owner (`account_id = 231869198`) and ≤ 10 friends, primarily focused on **turbo parties**. The backend (Python / FastAPI / DuckDB) is already live at `http://127.0.0.1:8000`. Your job: build the React SPA that talks to it. Think **Stratz match-list page, but fast and local-only**, with the ability to freely stack filters Stratz caps.

The full product vision lives in [README.md](README.md). Read it once before starting — the Frontend-specific details are below.

---

## 1. Tech stack

| Layer            | Choice                                       | Notes                                                                 |
|------------------|----------------------------------------------|-----------------------------------------------------------------------|
| Build / bundler  | **Vite** (`npm create vite@latest` → React + TS) | Local-only app, no SSR needed.                                     |
| Framework        | **React 18 + TypeScript (strict)**           | Default.                                                              |
| Routing          | **TanStack Router** (or React Router, your call) | Only 4–6 routes needed, either is fine.                            |
| Data fetching    | **TanStack Query** (`@tanstack/react-query`) | Cache by filter object; invalidate on "pull new".                    |
| Table            | **TanStack Table v8** (`@tanstack/react-table`) | Best-in-class for the filter-heavy match list.                   |
| Charts (later)   | **ECharts** via `echarts-for-react`          | Win-rate over time, tilt heatmap, etc. Not required for M3 UI.       |
| Styling          | **TailwindCSS** + `clsx`                     | Utility-first; matches the Stratz-dense look cheaply.                |
| Icons            | **lucide-react**                             | For UI controls. Hero/item icons come from dotaconstants CDN (§ 5).  |
| HTTP             | Built-in `fetch` is fine                     | Backend is on localhost; no need for axios.                          |
| Form / inputs    | Bare React + Tailwind. Pull in `react-hook-form` only if filter state grows complex. | — |
| State (global)   | TanStack Query cache + a tiny Zustand store for filter state | Avoid Redux; avoid Context hell.                       |
| Date formatting  | **`date-fns`**                               | Match timestamps are Unix seconds from backend.                      |

**Do not** reach for Next.js, SSR, or server components. This is localhost-only.

---

## 2. Directory layout

```
web/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx                # React root + QueryClientProvider + Router
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts           # fetch wrapper, base URL from env
│   │   ├── types.ts            # TS types matching backend JSON (§ 4)
│   │   └── hooks.ts            # useMatches, useSummary, useHeroes, useItems, useAccounts
│   ├── state/
│   │   └── filters.ts          # Zustand store for MatchFilter
│   ├── components/
│   │   ├── match-list/
│   │   │   ├── MatchTable.tsx  # TanStack Table
│   │   │   ├── MatchRow.tsx    # Custom cell renderer (hero icon, items, KDA, etc.)
│   │   │   ├── SummaryStrip.tsx
│   │   │   └── columns.tsx
│   │   ├── filters/
│   │   │   ├── FilterSidebar.tsx
│   │   │   ├── AccountPicker.tsx        # ⭐ co-presence picker (with/against)
│   │   │   ├── HeroPicker.tsx           # me / ally / enemy
│   │   │   ├── GameModeFilter.tsx
│   │   │   ├── DateRangeFilter.tsx
│   │   │   ├── DurationFilter.tsx
│   │   │   └── ResultFilter.tsx
│   │   ├── assets/
│   │   │   ├── HeroIcon.tsx
│   │   │   └── ItemIcon.tsx
│   │   └── ui/                 # Button, Popover, Combobox, etc.
│   ├── routes/
│   │   ├── MatchesPage.tsx     # PRIMARY — the Stratz-clone view
│   │   ├── HeroesPage.tsx      # stub for later
│   │   └── SettingsPage.tsx    # stub (pull-new button lives here)
│   ├── lib/
│   │   ├── formatters.ts       # fmtDuration, fmtRelTime, fmtKDA
│   │   └── constants.ts        # GAME_MODE_NAMES, LOBBY_TYPE_NAMES, POSITION_NAMES, RANK_TIER_NAMES
│   └── styles/
│       └── globals.css         # Tailwind directives + a dark Dota-ish theme
└── public/
```

Config-wise: a `.env.development` holds `VITE_API_BASE_URL=http://127.0.0.1:8000`.

---

## 3. Backend endpoints you will consume

Base URL: `http://127.0.0.1:8000`. CORS is already configured for `http://127.0.0.1:5173` and `http://localhost:5173`.

### 3.1 `GET /health`

Sanity check. Returns `{status, version, matches, parsed, tracked_players}`. Use in the header/footer as a liveness badge.

### 3.2 `GET /api/matches` — **the main table data source**

Query parameters (all optional except `account_id`):

| Param              | Type        | Notes                                                                 |
|--------------------|-------------|-----------------------------------------------------------------------|
| `account_id`       | int, required | The "me" pin. All returned rows are this account's POV.           |
| `hero_id`          | int[]       | Repeat the param (`?hero_id=1&hero_id=2`). OR within field.          |
| `with_account`     | int[]       | **⭐ co-presence: allies.** AND across the list (all must appear).   |
| `against_account`  | int[]       | **⭐ co-presence: enemies.** AND across the list.                    |
| `with_hero_id`     | int[]       | Ally picked this hero.                                               |
| `against_hero_id`  | int[]       | Enemy picked this hero.                                              |
| `game_mode`        | int[]       | `23` = turbo, `22` = all-pick ranked, etc. (§ 7).                    |
| `lobby_type`       | int[]       | `0` = normal, `7` = ranked, etc.                                     |
| `patch`            | int[]       | OpenDota patch id.                                                   |
| `party_size`       | int[]       | `1`–`5`.                                                              |
| `position`         | int[]       | `1`–`5` = carry / mid / off / soft-supp / hard-supp (lane_role).     |
| `facet_id`         | int[]       | Hero facet id (Stratz / patch 7.34+).                                |
| `date_from`        | ISO datetime | `YYYY-MM-DDTHH:MM:SS`.                                              |
| `date_to`          | ISO datetime |                                                                      |
| `duration_min_s`   | int         | seconds.                                                              |
| `duration_max_s`   | int         |                                                                       |
| `rank_tier_min`    | int         | OpenDota rank tier (11-85).                                          |
| `rank_tier_max`    | int         |                                                                       |
| `result`           | `"win"`/`"loss"` |                                                                  |
| `parsed_only`      | bool        | Only show matches with full parsed data.                             |
| `leaver_only`      | bool        | `leaver_status > 0`.                                                 |
| `limit`            | int (1–1000) | Default 100.                                                         |
| `offset`           | int         | Default 0.                                                            |
| `order_by`         | enum        | `start_time`\|`duration`\|`kills`\|`deaths`\|`assists`\|`gpm`\|`xpm`\|`net_worth`\|`imp` |
| `order_dir`        | `"asc"`/`"desc"` | Default `desc`.                                                 |

Response shape:

```json
{
  "matches": [
    {
      "match_id": 8766099742,
      "start_time": "2026-04-18T21:13:00",
      "duration": 1876,
      "game_mode": 23,
      "lobby_type": 7,
      "patch": 58,
      "radiant_win": true,
      "avg_rank_tier": 52,
      "parse_status": "parsed",
      "region": 3,
      "player_slot": 1,
      "account_id": 231869198,
      "hero_id": 74,
      "is_radiant": true,
      "kills": 12, "deaths": 4, "assists": 18,
      "gpm": 612, "xpm": 680,
      "last_hits": 180, "denies": 7,
      "hero_damage": 34120, "tower_damage": 2110, "hero_healing": 0,
      "net_worth": 19820, "level": 24,
      "lane": 2, "lane_role": 2, "position": 2,
      "facet_id": 1,
      "party_id": 9876, "party_size": 3,
      "leaver_status": 0, "rank_tier": 54,
      "imp": 32.1,
      "won": true
    }
  ]
}
```

### 3.3 `GET /api/matches/summary`

Same query params as `/api/matches` except `limit`, `offset`, `order_*`. Returns aggregates for the current filter set — drives the summary strip above the table:

```json
{
  "matches": 127,
  "wins": 71,
  "losses": 56,
  "winrate": 0.559,
  "avg_kills": 9.8, "avg_deaths": 6.1, "avg_assists": 14.2,
  "avg_gpm": 540, "avg_xpm": 605,
  "avg_imp": 8.7,
  "first_match": "2025-11-02T...", "last_match": "2026-04-19T..."
}
```

### 3.4 `GET /api/meta/heroes`

```json
[
  {"hero_id": 1, "name": "npc_dota_hero_antimage", "localized_name": "Anti-Mage",
   "primary_attr": "agi", "roles": ["Carry","Escape","Nuker"], "facets": [...]}
]
```

### 3.5 `GET /api/meta/items`

```json
[{"item_id": 63, "name": "power_treads", "cost": 1400}]
```

### 3.6 `GET /api/meta/accounts`

Powers the **co-presence picker**. Only returns account_ids that already appear in the local match history, so you never show irrelevant Steam accounts.

Query params:

- `tracked` (int, optional): if set, count only co-occurrences with this account_id. For the UI, pass the currently-selected "me" account so the list ranks by "who do I play with most".
- `min_matches` (int, default 1).

```json
[
  {"account_id": 303767373, "match_count": 412, "tracked": false},
  {"account_id": 231869198, "match_count": 8923, "tracked": true}
]
```

`personas` / steam display names are **not yet** exposed by this endpoint — show `account_id` as the label for now; a follow-up task will add `persona` resolution via Steam Web API. Use `tracked: true` to badge "★ tracked".

---

## 4. TypeScript types to define in `src/api/types.ts`

Mirror the JSON exactly. Ordering-sensitive enums:

```ts
export type Match = {
  match_id: number;
  start_time: string;            // ISO; parse with date-fns
  duration: number;              // seconds
  game_mode: number;
  lobby_type: number;
  patch: number;
  radiant_win: boolean;
  avg_rank_tier: number | null;
  parse_status: "unparsed" | "pending" | "parsed";
  region: number | null;
  player_slot: number;
  account_id: number;
  hero_id: number;
  is_radiant: boolean;
  kills: number; deaths: number; assists: number;
  gpm: number; xpm: number;
  last_hits: number; denies: number;
  hero_damage: number; tower_damage: number; hero_healing: number;
  net_worth: number; level: number;
  lane: number | null;
  lane_role: number | null;
  position: number | null;
  facet_id: number | null;
  party_id: number | null;
  party_size: number | null;
  leaver_status: number;
  rank_tier: number | null;
  imp: number | null;
  won: boolean;
};

export type Summary = {
  matches: number;
  wins: number;
  losses: number;
  winrate: number;
  avg_kills: number; avg_deaths: number; avg_assists: number;
  avg_gpm: number; avg_xpm: number; avg_imp: number | null;
  first_match: string | null;
  last_match: string | null;
};

export type MatchFilterState = {
  account_id: number;          // default 231869198
  hero_ids: number[];
  with_accounts: number[];
  against_accounts: number[];
  with_hero_ids: number[];
  against_hero_ids: number[];
  game_modes: number[];
  lobby_types: number[];
  party_sizes: number[];
  positions: number[];
  facet_ids: number[];
  date_from?: string;
  date_to?: string;
  duration_min_s?: number;
  duration_max_s?: number;
  rank_tier_min?: number;
  rank_tier_max?: number;
  result?: "win" | "loss";
  parsed_only: boolean;
  leaver_only: boolean;
  limit: number;               // default 100
  offset: number;              // default 0
  order_by: "start_time" | "duration" | "kills" | "deaths" | "assists" | "gpm" | "xpm" | "net_worth" | "imp";
  order_dir: "asc" | "desc";
};
```

Important: backend lists use **repeated params**, not CSV. Build the query string with `URLSearchParams` and call `.append(name, value)` in a loop for each item.

---

## 5. Assets — hero and item icons

The backend does **not** serve icons. Pull them straight from dotaconstants' CDN:

- Hero portraits: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/{short_name}.png`
  where `short_name = hero.name.replace("npc_dota_hero_", "")` (e.g. `antimage`).
- Item icons: `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/{name}.png`
  (e.g. `power_treads`).

Build `<HeroIcon heroId={n} />` and `<ItemIcon itemId={n} />` that look up `short_name` from the `/api/meta/heroes` and `/api/meta/items` responses (cached once via TanStack Query). Missing items render an empty slot — don't hard-fail on 404s.

---

## 6. The primary view: Matches page

Model after the Stratz player match-list page (screenshots: `stratz.com/players/231869198/matches?withEnemySteamAccountIds=303767373`).

### 6.1 Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER: logo · health badge · "Pull new matches" (stub) · account   │
├─────────────┬────────────────────────────────────────────────────────┤
│             │  SUMMARY STRIP                                          │
│  FILTERS    │  [ 127 matches · 56% WR · 9.8/6.1/14.2 · 540 GPM · ...] │
│  SIDEBAR    ├────────────────────────────────────────────────────────┤
│             │  MATCH TABLE                                            │
│  – Hero     │  ┌──────┬──────┬─────┬─────────┬──────┬──────┬────┐   │
│  – W/L      │  │ Hero │ Role │ W/L │  K/D/A  │ IMP  │ Items│ ...│   │
│  – Co-pres. │  ├──────┼──────┼─────┼─────────┼──────┼──────┼────┤   │
│    (with)   │  │ [🦄] │ Mid  │  W  │ 12/4/18 │ +32  │ [💍] │    │   │
│    (vs.)    │  │ ...                                              │   │
│  – Game mode│  └─────────────────────────────────────────────────┘   │
│  – Duration │                                                         │
│  – Date     │                                                         │
│  – Parsed   │                                                         │
└─────────────┴────────────────────────────────────────────────────────┘
```

Sidebar is sticky on desktop; collapses into a drawer on < 1024px.

### 6.2 Match row columns (left → right)

| Column        | Source                                           | Rendering                                                                 |
|---------------|--------------------------------------------------|---------------------------------------------------------------------------|
| Hero          | `hero_id`                                        | `<HeroIcon>` + localized name.                                            |
| Role          | `lane_role` / `position`                         | `"Safe"`/`"Mid"`/`"Off"`/`"SoftSup"`/`"HardSup"` (§ 7 mapping).          |
| W/L           | `won`                                            | Green "W" / red "L" pill.                                                 |
| K/D/A         | `kills`/`deaths`/`assists`                       | `<span class="text-green">K</span>/<span class="text-red">D</span>/<span class="text-yellow">A</span>` |
| IMP           | `imp`                                            | Signed number, colored. Null → em-dash.                                   |
| Party         | `party_size`                                     | Icon + number; solo = grey.                                               |
| Rank          | `rank_tier`                                      | Dota medal icon (immortal/divine/ancient/...). § 7 has tier→name.        |
| GPM / XPM     | `gpm`/`xpm`                                      | Two small numbers stacked.                                                |
| Net Worth     | `net_worth`                                      | `19.8k` formatting.                                                       |
| Items         | fetched lazily per-row via `/api/matches/{id}` *(future; backend endpoint not yet built — leave placeholder for now)* | 6 small item icons. Until endpoint exists, render skeletons. |
| Mode          | `game_mode` / `lobby_type`                       | "Turbo" / "Ranked AP" / etc. (§ 7).                                      |
| Duration      | `duration`                                       | `m:ss`.                                                                   |
| When          | `start_time`                                     | Relative ("3h ago"), tooltip = absolute local time.                       |

Clicking a row opens a match detail side panel (stub for M3; populate in M4).

### 6.3 Sorting / paging

- Table column headers trigger `order_by` + `order_dir`. Map clicks → state → re-fetch.
- Pagination via `limit` + `offset` with a "Load more" button (infinite-scroll optional).

### 6.4 Summary strip

Driven by `/api/matches/summary` with the same filter. Show:

- `N matches` · winrate % · W–L record
- K/D/A averages
- Avg GPM / XPM
- Avg IMP (hide if null)
- Date range: "first_match → last_match"

Re-fetch whenever the filter changes. Debounce 200ms.

---

## 7. Dota constants the UI needs

Encode in `src/lib/constants.ts` (no backend lookup needed for these).

```ts
export const GAME_MODE_NAMES: Record<number, string> = {
  0: "Unknown", 1: "All Pick", 2: "Captains Mode", 3: "Random Draft",
  4: "Single Draft", 5: "All Random", 12: "Least Played", 16: "Captains Draft",
  17: "Balanced Draft", 22: "All Draft (Ranked)", 23: "Turbo"
};

export const LOBBY_TYPE_NAMES: Record<number, string> = {
  0: "Normal", 1: "Practice", 5: "Team MM", 6: "Solo MM", 7: "Ranked",
  8: "Solo 1v1", 9: "Battle Cup"
};

export const POSITION_NAMES: Record<number, string> = {
  1: "Safelane",   // lane_role 1 = safelane carry
  2: "Midlane",
  3: "Offlane",
  4: "Jungle"      // rare post-7.00
};

export const RANK_TIER_NAMES: Record<number, string> = {
  11: "Herald 1", 12: "Herald 2", /* ... */
  51: "Legend 1", 52: "Legend 2", 53: "Legend 3", 54: "Legend 4", 55: "Legend 5",
  61: "Ancient 1", /* ... */
  71: "Divine 1", /* ... */
  80: "Immortal"
  // Fill in the full ladder — pattern is tier * 10 + stars.
};
```

Default filter on first load: `game_modes = [23]` (turbo), `account_id = 231869198`.

---

## 8. Co-presence filter UX (the headline feature)

Inside `AccountPicker.tsx`:

- Two fields side by side: **"With ally"** (`with_accounts`) and **"Against enemy"** (`against_accounts`).
- Each field is a multi-select combobox backed by `/api/meta/accounts?tracked=<me>`.
- Ranked by `match_count` desc. Tracked accounts get a star.
- Chips are removable inline.
- The URL should reflect the filter — use `?with_account=303767373` style so users can bookmark / share (even though it's local-only, this mirrors the Stratz workflow the owner is used to).

Test case to verify correctness once wired up:

> With `account_id=231869198` and `against_account=303767373`, the table should show exactly the matches where account 303767373 was on the **opposing** team. This is the Stratz `withEnemySteamAccountIds=303767373` equivalent.

---

## 9. Dev workflow

```bash
# One-time
cd web
npm install

# Day to day (the owner runs the backend separately)
npm run dev          # Vite on :5173, proxies nothing — hits :8000 via CORS
```

The owner enforces this rule in `CLAUDE.md`:

> **NEVER run development servers automatically (npm run dev, etc.) unless explicitly asked by the user.**

So: scaffold, write code, run `npm run build` + `npx tsc --noEmit` to validate, but **don't** start `npm run dev` on your own. Report to the owner when a milestone is ready and they'll run it.

---

## 10. Milestones for the frontend

Keep scope tight. Ship M3-UI first, then iterate.

| # | Goal                                                                              |
|---|-----------------------------------------------------------------------------------|
| F0 | Scaffold: `web/` with Vite + React + TS + Tailwind + QueryClient + Router.       |
| F1 | Minimal Matches page: filter sidebar (hero, game_mode, date, result), table with core columns, summary strip. No co-presence yet. |
| F2 | **Co-presence pickers (`with_account`, `against_account`).** Headline feature. Verify against the Stratz URL test case (§ 8). |
| F3 | Hero cross-filters (`with_hero_id`, `against_hero_id`).                          |
| F4 | Match detail side-panel (click a row → draft + player list + items + teamfights). Requires backend extension; coordinate. |
| F5 | Saved views (filter specs persisted to localStorage).                            |
| F6 | "Pull new matches" button (POST to a not-yet-existing `/api/ingest/refresh`). Stub until backend ships it. |
| F7 | Hero splits page — pivot by my hero / ally hero / enemy hero.                    |

Anything past F5 is explicitly out of scope for the initial parallel push. Stop there and hand back for review.

---

## 11. Style / polish notes

- **Dark theme only**, Dota-ish palette: near-black background, radiant green / dire red accents for W/L.
- **Density over whitespace** — this is a power-user tool. Tight row heights, small-but-legible typography, `tabular-nums` for stats columns.
- **No toast spam.** Errors surface as inline banners in the affected area.
- **Loading states**: skeleton rows for the table, spinner for the summary strip — never a full-page spinner.
- **Keyboard**: `/` focuses filter search, `Esc` clears it, arrow keys traverse table rows.

---

## 12. What to do when you hit ambiguity

1. **If it's a visual / UX choice** (exact palette shade, chart colors, hover effects): decide yourself and move on. The owner will push back on anything they want different.
2. **If it's a backend-shape question**: check the types in `src/api/types.ts` and the actual JSON from running the backend once. If the backend is missing something you need, open a note in a `BACKEND-REQUESTS.md` file at the repo root listing what's blocking you — don't try to work around with mock data silently.
3. **If it's scope creep** ("should I also build the hero splits page?"): stop at the milestone boundary and report back.

Good luck. The owner is already using the backend from the CLI, so they can verify your UI against what they expect immediately.
