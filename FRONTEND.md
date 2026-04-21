# Frontend Spec — `dota-local` web UI

Self-contained spec for building the [web/](web/) frontend in parallel with backend work. A parallel Claude instance should be able to execute this without asking the owner any questions.

This spec supersedes the earlier sidebar-based version. **Top nav + horizontal filter bar**, **right rail of summary panels**, **match detail overlay**, **account switcher in the header**.

---

## 0. Context in one paragraph

`dota-local` is a **local-only, single-user Dota 2 analytics tool** for the owner (default `account_id = 231869198`, persona "Dommy [PWNP]") and ≤ 10 friends, primarily focused on **turbo parties**. The backend (Python / FastAPI / DuckDB) runs at `http://127.0.0.1:8000`. Your job: build the React SPA that talks to it. Think **Stratz player match-list page, but fast and local-only**, with the ability to freely stack filters Stratz caps.

The full product vision lives in [README.md](README.md). Read it once before starting — the frontend-specific details are below.

---

## 1. Tech stack

| Layer            | Choice                                       | Notes                                                                 |
|------------------|----------------------------------------------|-----------------------------------------------------------------------|
| Build / bundler  | **Vite** (`npm create vite@latest` → React + TS) | Local-only app, no SSR needed.                                     |
| Framework        | **React 18 + TypeScript (strict)**           | Default.                                                              |
| Routing          | **TanStack Router** (or React Router)        | ~5 routes: Matches, Match Detail, Heroes, Party, Settings.           |
| Data fetching    | **TanStack Query** (`@tanstack/react-query`) | Cache by filter object; invalidate on "pull new".                    |
| Table            | **TanStack Table v8** (`@tanstack/react-table`) | Virtualised, column-visibility persisted to localStorage.         |
| Charts           | **ECharts** via `echarts-for-react`          | Net-worth graph in match detail, activity heatmap, hero donut.       |
| Styling          | **TailwindCSS** + `clsx`                     | Utility-first. Theme tokens declared in `tailwind.config.ts` (§ 3). |
| Icons            | **lucide-react**                             | UI controls only. Hero/item icons via Steam CDN (§ 6).               |
| HTTP             | Built-in `fetch` or `ky`                     | Backend is on localhost; CORS is wired.                              |
| State            | TanStack Query cache + **Zustand** store for filter + UI state | No Redux, no Context soup.                            |
| Date formatting  | **`date-fns`**                               | Match timestamps are ISO strings from backend.                        |

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
│   │   ├── types.ts            # TS types matching backend JSON (§ 5)
│   │   └── hooks.ts            # useMatches, useSummary, useMatchDetail,
│   │                           # useHeroes, useItems, useAccounts,
│   │                           # useHeroStats, useTeammateStats, useActivity
│   ├── state/
│   │   ├── filters.ts          # Zustand: MatchFilter + serialize to URL
│   │   └── ui.ts               # Zustand: density, column visibility, active panel
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx    # Header + FilterBar + main + RightRail
│   │   │   ├── Header.tsx      # logo, health, AccountSwitcher, Pull-new
│   │   │   └── FilterBar.tsx   # horizontal chip bar (§ 8)
│   │   ├── match-list/
│   │   │   ├── MatchTable.tsx
│   │   │   ├── MatchRow.tsx
│   │   │   ├── SummaryStrip.tsx
│   │   │   └── columns.tsx
│   │   ├── match-detail/
│   │   │   ├── MatchDetail.tsx # routed page + keyboard-back
│   │   │   ├── ScoreboardGrid.tsx
│   │   │   ├── NetWorthChart.tsx
│   │   │   ├── DraftStrip.tsx
│   │   │   ├── KillFeed.tsx    # stub until backend stores kill log
│   │   │   └── SkillBuild.tsx
│   │   ├── panels/             # right-rail panels (§ 9)
│   │   │   ├── HeroStatsPanel.tsx
│   │   │   ├── TeammatesPanel.tsx
│   │   │   └── ActivityHeatmap.tsx
│   │   ├── filters/
│   │   │   ├── AccountPicker.tsx    # with/against multi-select popover
│   │   │   ├── HeroPicker.tsx       # me/ally/enemy
│   │   │   ├── GameModePopover.tsx
│   │   │   ├── DateRangePopover.tsx
│   │   │   └── ResultChip.tsx
│   │   ├── assets/
│   │   │   ├── HeroIcon.tsx
│   │   │   ├── ItemIcon.tsx
│   │   │   └── AbilityIcon.tsx
│   │   └── ui/                 # Popover, Combobox, Chip, Tooltip, Button
│   ├── routes/
│   │   ├── MatchesPage.tsx     # PRIMARY view
│   │   ├── MatchDetailPage.tsx # /match/:match_id
│   │   ├── HeroesPage.tsx      # later — hero splits
│   │   └── SettingsPage.tsx    # Pull-new button stub, account mgmt
│   ├── lib/
│   │   ├── formatters.ts       # fmtDuration, fmtRelTime, fmtKNum, fmtWR
│   │   ├── constants.ts        # GAME_MODE_NAMES, LOBBY_TYPE_NAMES, POSITION_NAMES, RANK_TIER_NAMES
│   │   └── dota.ts             # heroShortName(hero_id), imp color, rank color
│   └── styles/
│       └── globals.css         # Tailwind directives
└── public/
```

Dev env file: `.env.development` holds `VITE_API_BASE_URL=http://127.0.0.1:8000`.

---

## 3. Design tokens

The prototype bundle from Claude Design landed on these tokens. Bake them into `tailwind.config.ts` — do not redesign the palette.

### 3.1 Palette

```ts
colors: {
  // Canvas
  bg:        '#080b10',   // body background
  surface:   '#0a0e16',   // cards, header, summary strip
  surface2:  '#0d1420',   // popovers, tweak panel
  // Borders
  border:    '#111822',
  border2:   '#1a2232',
  // Text
  text:      '#c8d0e0',
  muted:     '#8a9ab8',
  ghost:     '#5a6882',
  ghost2:    '#3a4a62',
  // Accents
  radiant:   '#3dce84',   // wins, "W", radiant
  dire:      '#ff5454',   // losses, "L", dire
  gold:      '#e8a020',   // GPM, assists, stars
  xp:        '#a78bfa',   // XPM
  link:      '#4d9eff',   // interactive accents
  // Position accents (ally/enemy inference): reuse link/xp/gold/radiant/ghost
}
```

### 3.2 Typography

- **UI**: `Inter` — 400 / 500 / 600 / 700. Import from Google Fonts.
- **Stats, match IDs, timestamps**: `JetBrains Mono` — 400 / 500 / 700. Always `tabular-nums`.
- **Section labels** (uppercase, tracked): `text-[10px] font-bold tracking-[.12em] uppercase text-ghost2`.

### 3.3 Density

**Comfortable is the default** (redesign decision). Row height ~48px, 12px vertical padding, 14px font for primary stats. Compact mode available via settings for power users — toggles row height to 36px / 11px.

### 3.4 Layout container

- `max-w-[1600px] mx-auto px-6` — side padding prevents full-bleed at 2160p+. On narrow laptops (`< 1280px`) padding collapses to `px-3`; below `1024px` the right rail collapses (see § 11 mobile).

### 3.5 Animations

From the prototype — keep:
- `pulse-dot` on the health badge (2s infinite, subtle green glow).
- `slideUp` on the match detail overlay and mobile filter drawer (120ms ease-out).
- `fadeIn` on popovers and the tweaks panel (200ms).
- `shimmer` on loading skeletons (1.5s infinite).

---

## 4. Global layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (48px, fixed)                                                            │
│  [⚔ dota-local] [● local · 347 matches] ……… [↻ Pull new] [★ Dommy ▾]           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ FILTER BAR (44px, sticky)                                                       │
│  [Result ▾] [Mode: Turbo ×] [With: VoidOfDoom ×] [Against: …] [+ Add filter]   │
├────────────────────────────────────────────────┬────────────────────────────────┤
│ SUMMARY STRIP (52px)                           │ RIGHT RAIL (320px, sticky)     │
│ 127 matches · 55.9% WR · 71-56 · 9.8/6.1/14.2  │  ▸ Hero stats (donut + rows)   │
├────────────────────────────────────────────────┤  ▸ Teammates (winrate bars)   │
│ MATCH TABLE                                    │  ▸ Activity (180-day heatmap) │
│   comfortable rows, virtualised                │                                │
│   click row → /match/:id                       │                                │
│ ...                                            │                                │
└────────────────────────────────────────────────┴────────────────────────────────┘
```

- Header, filter bar, summary strip are sticky.
- Right rail is sticky within the scroll container, hides below 1280px.
- Whole shell sits in the `max-w-[1600px]` container.

---

## 5. TypeScript types

Mirror the JSON exactly in `src/api/types.ts`.

```ts
export type Match = {
  match_id: number;
  start_time: string;
  duration: number;
  game_mode: number;
  lobby_type: number;
  patch: number | null;
  radiant_win: boolean;
  avg_rank_tier: number | null;
  parse_status: "unparsed" | "pending" | "parsed" | "unparseable" | "unavailable";
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
  wins: number; losses: number;
  winrate: number;
  avg_kills: number; avg_deaths: number; avg_assists: number;
  avg_gpm: number; avg_xpm: number; avg_imp: number | null;
  first_match: string | null;
  last_match: string | null;
};

export type MatchDetail = {
  match: {
    match_id: number; start_time: string; duration: number;
    game_mode: number; lobby_type: number; patch: number | null;
    region: number | null; radiant_win: boolean;
    avg_rank_tier: number | null; parse_status: string;
    source: string | null; replay_url: string | null;
  };
  players: Array<{
    player_slot: number; account_id: number | null; hero_id: number;
    is_radiant: boolean;
    kills: number; deaths: number; assists: number;
    gpm: number; xpm: number; last_hits: number; denies: number;
    hero_damage: number; tower_damage: number; hero_healing: number;
    net_worth: number; level: number;
    lane: number | null; lane_role: number | null;
    position: number | null; facet_id: number | null;
    party_id: number | null; party_size: number | null;
    leaver_status: number; rank_tier: number | null; imp: number | null;
    items: Array<{ slot_idx: number; item_id: number; ts_purchased: number | null }>;
    ability_upgrades: Array<{ ability_id: number; level: number; time: number | null }>;
  }>;
  draft: Array<{ order_idx: number; is_pick: boolean | null; is_radiant: boolean | null; hero_id: number; player_slot: number | null }>;
  objectives: Array<{ time: number; type: string; value: number | null; slot: number | null }>;
  chat: Array<{ time: number; slot: number; type: string; text: string }>;
  teamfights: Array<{ start_ts: number; end_ts: number; deaths: number }>;
};

export type HeroStat = {
  hero_id: number;
  games: number; wins: number; winrate: number;
  avg_kills: number; avg_deaths: number; avg_assists: number;
  avg_gpm: number; avg_xpm: number; avg_imp: number | null;
};

export type TeammateStat = {
  account_id: number;
  games: number; wins: number; winrate: number;
  tracked: boolean;
};

export type ActivityDay = {
  day: string;   // ISO date
  games: number; wins: number;
};

export type MatchFilterState = {
  account_id: number;
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
  date_from?: string; date_to?: string;
  duration_min_s?: number; duration_max_s?: number;
  rank_tier_min?: number; rank_tier_max?: number;
  result?: "win" | "loss";
  parsed_only: boolean;
  leaver_only: boolean;
  limit: number; offset: number;
  order_by: "start_time" | "duration" | "kills" | "deaths" | "assists" | "gpm" | "xpm" | "net_worth" | "imp";
  order_dir: "asc" | "desc";
};
```

Lists use **repeated params**, not CSV. Build with `URLSearchParams.append(name, value)` in a loop.

---

## 6. Backend endpoints you consume

Base URL: `http://127.0.0.1:8000`. CORS wired for `:5173`.

### 6.1 `GET /health` — liveness + counts

Returns `{status, version, matches, parsed, tracked_players}`. Power the pulse dot in the header.

### 6.2 `GET /api/matches` — main table data

Query: `account_id` (required) + every filter in § 5 `MatchFilterState` + `limit`, `offset`, `order_by`, `order_dir`. Returns `{ matches: Match[] }`.

### 6.3 `GET /api/matches/summary` — filter-aligned aggregates

Same query shape as `/api/matches` (minus paging/ordering). Returns `Summary`. Powers the summary strip.

### 6.4 `GET /api/matches/{match_id}` — full parsed detail ⭐ **new**

No account scoping — the detail page is POV-agnostic. Returns `MatchDetail`. 404 if the `match_id` isn't in the local DB. Unparsed matches return `parse_status ≠ 'parsed'` with thin arrays — handle with a "not yet parsed" state.

**Kill-by-hero breakdown** is **not** available yet — OpenDota's `kills_log` isn't stored. The KillFeed component should render "Kill log unavailable — replay parser pending (M9)" with the per-player kill totals from `players[*].kills` as a fallback.

### 6.5 `GET /api/stats/heroes` — per-hero aggregates ⭐ **new**

Query: same filter shape as `/api/matches` + `limit` (default 50). Returns `{ heroes: HeroStat[] }`. Drives the hero donut and the "Most Played Heroes" panel in the right rail.

### 6.6 `GET /api/stats/teammates` — teammate winrates ⭐ **new**

Query: same filter shape + `limit` (30), `min_games` (3). Returns `{ teammates: TeammateStat[] }`. Powers the Teammates panel. `tracked: true` flags accounts in `players.is_tracked`.

### 6.7 `GET /api/stats/activity` — daily histogram ⭐ **new**

Query: same filter shape + `days` (default 180). Returns `{ days: ActivityDay[] }`. Drives the activity heatmap.

### 6.8 `GET /api/meta/heroes` / `/api/meta/items` / `/api/meta/accounts`

Constants + the account picker data source. `/api/meta/accounts?tracked={me_id}` ranks accounts by co-occurrence with the current "me". **Personas are not yet populated** — render the `account_id` as the label until the Steam Web API ingest lands (M5). `tracked: true` → "★" badge.

---

## 7. Account switcher

The owner's account is no longer hard-coded. The header shows a switcher that defaults to `231869198` and persists the selection to `localStorage` under `dota-local:account_id`.

- Render as a button in the header (`★ Dommy ▾`).
- On click, open a popover listing every tracked account: `GET /api/meta/accounts?min_matches=1` filtered client-side to `tracked === true`, plus a "Change account…" combobox that takes a raw `account_id` (numeric input) for ad-hoc use.
- Changing the account **updates the filter state** (`account_id`) and re-queries all endpoints. Do not clear the rest of the filter — users often want to re-run the same filter under a different POV.
- URL reflects the selection too: `?me=231869198`. Deep links are sacred.

Backend-side: the selection is just an `account_id` query param on every request. No auth, no session.

---

## 8. Filter bar (horizontal, chip-based)

**Why not a sidebar?** Top-bar paradigm matches Stratz/Dotabuff muscle memory, frees full content width for the table, and makes "what am I currently filtered by" legible at a glance.

### 8.1 Layout

Sticky strip under the header, 44px tall, flex-row with gap-2:

```
[Result: Win ×] [Mode: Turbo ×] [With: VoidOfDoom + QuantumPudge ×] [+ Add filter ▾]
                                                          ^ 2 chips, close on click
```

- Primary filter chips (Result, Mode, With, Against, My Hero) are always visible as "buttons" even when empty — clicking opens a popover.
- Secondary filters (Date range, Duration, Party size, Position, Rank range, Parsed-only, Leaver-only) live behind an `+ Add filter` dropdown; once applied they become chips like the rest.
- Each chip: `rounded-md border border-border2 bg-surface2 px-3 py-1.5 text-xs`. Active filters get a blue left-border. Remove via `×` on hover.
- Clear-all on the right: `Clear filters` link, only shown when any filter is non-default.

### 8.2 Popover contents

- **Result**: 3 radios — Any / Win / Loss.
- **Game Mode**: multi-select checkbox list. Default option `[23] Turbo`.
- **With / Against**: `AccountPicker` (see below).
- **My Hero**: hero grid (7×N), search-filtered.
- **Ally hero / Enemy hero**: same grid.
- **Date range**: `date-fns` + two date inputs + quick buttons (Last 7d / 30d / 90d / Patch).
- **Duration**: min/max sliders (0–60m).
- **Rank range**: min/max sliders over the rank tier ladder.
- **Party size**: checkbox 1–5.
- **Position**: checkbox 1–4 (lane_role).
- **Misc**: `Parsed only`, `Leaver only`.

### 8.3 AccountPicker

Two vertically-stacked sections in one popover: **With ally** and **Against enemy**. Each is a multi-select combobox backed by `/api/meta/accounts?tracked={account_id}`. Ranked by `match_count` desc. Tracked accounts get a `★`.

Test case (must pass): `account_id=231869198` + `against_account=303767373` returns exactly the matches where 303767373 was on the opposing team. Mirrors `stratz.com/players/231869198/matches?withEnemySteamAccountIds=303767373`.

### 8.4 URL serialization

Filter state round-trips through the URL as `?hero_id=74&hero_id=88&with_account=303767373&date_from=2026-03-01`. No custom codec — just the same repeated-param format the backend expects. Persist the `Zustand` store from the URL on mount, and push to the URL on change (debounced 200ms).

---

## 9. Right rail — the summary panels

320px sticky column on the right of the main viewport. Three panels stacked vertically, each 16px gap, each collapsible with a chevron.

### 9.1 Hero stats panel

Powered by `/api/stats/heroes`. Renders a **small donut** (top-6 heroes by games, wedges coloured by primary_attr) with hover tooltips showing `games · winrate · K/D/A · GPM`, plus a stacked list of the rest:

```
[hero icon] Juggernaut    68% ████░░  800 games
[hero icon] Pudge         54% ██░░░░  482 games
...
```

### 9.2 Teammates panel

Powered by `/api/stats/teammates`. Rank by games-together desc. Row:

```
[avatar] ★ VoidOfDoom     58.2%  412
[avatar]   QuantumPudge   46.6%  287
```

- Green bar for WR > 52%, red for < 48%, grey between.
- Clicking a row adds the account_id to the **With** filter.
- Persona labels fall back to the raw `account_id` until M5 adds Steam Web API resolution.

### 9.3 Activity heatmap

Powered by `/api/stats/activity?days=180`. GitHub-style grid, 7 rows × N columns, cell colour by games/day (0 = dark, 5+ = full). Tooltip: `2026-04-18 · 5 games · 3W / 2L`.

### 9.4 Mobile / narrow

Below 1280px wide, collapse the right rail. Provide a toolbar button that opens the same three panels in a bottom sheet.

---

## 10. Match list page (primary view)

### 10.1 Columns (comfortable default)

Left → right, in this order. `*` = hideable via column-picker (persisted to localStorage).

| Column        | Field                      | Rendering                                                              |
|---------------|----------------------------|------------------------------------------------------------------------|
| W/L border    | `won`                      | 2px green/red left border on the row — primary visual signal.          |
| Hero          | `hero_id`                  | `<HeroIcon w=56 h=32>` + localized_name stacked.                       |
| Role          | `lane_role`                | `PosBadge` pill (Carry/Mid/Off/Sup4/Sup5).                             |
| Lane outcome *| derived                    | Won / Lost / Draw pill — from Stratz when available (M5); else `—`.    |
| K/D/A         | `kills`/`deaths`/`assists` | Coloured, monospace, tabular-nums.                                     |
| IMP *         | `imp`                      | Signed, coloured badge. `—` when null.                                 |
| Level *       | `level`                    | Monospace int.                                                         |
| Net worth *   | `net_worth`                | `19.8k` formatting, gold colour.                                       |
| GPM / XPM *   | `gpm`, `xpm`               | Two small stacked numbers.                                             |
| Hero dmg *    | `hero_damage`              | `fmtKNum(v)`.                                                          |
| Tower dmg *   | `tower_damage`             | `fmtKNum(v)`.                                                          |
| Party         | `party_size`               | `P3` badge / `Solo` muted.                                             |
| Rank          | `rank_tier`                | Medal name in tier colour.                                             |
| Items         | from `/api/matches/{id}`   | 6 small item icons. Lazy-fetched via `useMatchDetail(match_id)`; skeletons until resolved. |
| Mode          | `game_mode`, `lobby_type`  | "Turbo" / "Ranked AP" / etc.                                           |
| Duration      | `duration`                 | `m:ss`.                                                                |
| When          | `start_time`               | Relative ("3h ago"), tooltip = absolute local time.                    |

**Column picker** lives in the settings popover and writes to `localStorage` as `dota-local:columns`.

### 10.2 Row interaction

- Entire row is a link (`Link to="/match/:match_id"`). No sub-actions.
- Hover: very subtle `bg-surface2` lift.
- Keyboard: `j`/`k` navigate, `Enter` opens the detail page.

### 10.3 Sorting + paging

- Column header click toggles `order_by` / `order_dir`. Visible arrow on the active column.
- Paging: `limit=100` + `Load more` button appends via TanStack Query's `useInfiniteQuery`.

### 10.4 Summary strip

Driven by `/api/matches/summary`. Show:

`[N matches] · [WR%] · [W-L] · [K/D/A avg] · [GPM avg] · [XPM avg] · [IMP avg] · [first → last]`

Debounce filter changes 200ms before re-fetching the summary.

---

## 11. Match detail page (`/match/:match_id`)

Routed page, not an overlay. Cmd-click / middle-click on a row opens in a new tab. Back button returns to the filtered match list with state preserved.

### 11.1 Layout

Reference the first screenshot the owner pasted (Radiant 47 · Dire 28 · Won · Stomp).

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HEADER BAR  [← Back] · Radiant 47 – 28 Dire · 28:35 · Unranked/Turbo · US West │
├─────────────────────────────────────────────────────────────────────────────────┤
│ MATCHUP GRID  (10 player cards, 5 + 5)                                          │
│   [hero|role|facet] +20 ▓▓ | K/D/A | Net worth | Persona | Rank medal           │
├─────────────────────────────────┬───────────────────────────────────────────────┤
│ NET WORTH & XP CHART            │ LANE OUTCOMES                                 │
│   dual-line ECharts             │   Top: Radiant won                            │
│   shaded radiant/dire regions   │   Mid: draw                                   │
├─────────────────────────────────┤   Bot: Radiant stomp                          │
│ DRAFT STRIP                     ├───────────────────────────────────────────────┤
│   order-indexed row of bans +   │ OBJECTIVES timeline (roshans, towers, glyph)  │
│   3 pick phases                 │                                               │
├─────────────────────────────────┴───────────────────────────────────────────────┤
│ BUILDS                                                                          │
│   Per-player card: hero, skill build row (ability icons by level),              │
│   item timeline (item icons with purchase minute), final 6 + backpack + neutral │
├─────────────────────────────────────────────────────────────────────────────────┤
│ CHAT (collapsed by default, expands to a virtualised list)                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Data sources

Single call to `/api/matches/{match_id}` returns everything except hero/item/ability metadata, which comes from the already-cached `/api/meta/*` queries.

### 11.3 Sections (priority)

1. **Header bar** + **Matchup grid** — required for M-F4.
2. **Net worth / XP chart** — ECharts line. Radiant green, dire red, subtle gridlines.
3. **Draft strip** — ordered bans + picks by phase.
4. **Builds** — skill build timeline + item timeline. Item times come from `items[].ts_purchased` (may be null for the final inventory; show without a badge in that case).
5. **Lane outcomes** — requires Stratz (M5). Until then, show `—`.
6. **Objectives timeline** — horizontal axis = game time, vertical lanes for roshan / tower / glyph. Tooltip on hover.
7. **Kill feed** — stubbed out with a "not yet available" note; backend doesn't store OpenDota's `kills_log`.
8. **Chat** — lowest priority; hidden behind a disclosure.

### 11.4 Unparsed state

If `match.parse_status !== 'parsed'`, render a banner: *"This match hasn't been parsed. Results visible below are limited to the basic fields OpenDota exposes without a replay parse. Run `dota-local ingest enrich --recent-only` to request a parse."*

---

## 12. Dota constants the UI needs

Hard-code in `src/lib/constants.ts` — these don't change often enough to merit a backend call.

```ts
export const GAME_MODE_NAMES: Record<number, string> = {
  0: "Unknown", 1: "All Pick", 2: "Captains Mode", 3: "Random Draft",
  4: "Single Draft", 5: "All Random", 12: "Least Played", 16: "Captains Draft",
  17: "Balanced Draft", 22: "Ranked AP", 23: "Turbo",
};

export const LOBBY_TYPE_NAMES: Record<number, string> = {
  0: "Normal", 1: "Practice", 5: "Team MM", 6: "Solo MM", 7: "Ranked",
  8: "Solo 1v1", 9: "Battle Cup",
};

export const POSITION_NAMES: Record<number, string> = {
  1: "Safelane", 2: "Midlane", 3: "Offlane", 4: "Jungle",
};

// Fill the full ladder (Herald 1 → Immortal). Pattern: tier = rank_tier // 10, stars = rank_tier % 10.
```

Default-on filter on first load: `game_modes = [23]` (turbo), `account_id = <last selected or 231869198>`.

---

## 13. Settings / tweaks

Small cog button in the header, opens a popover over the right rail:

- **Density**: Compact / Comfortable (default).
- **Column visibility**: checkbox per hideable column.
- **IMP highlight threshold**: slider 0–60. Matches with `|imp| ≥ threshold` get a gold border on the IMP cell.
- **Account**: quick link to the account switcher.
- **Pull new matches**: stub button (backend endpoint not yet built — M6).

Persist to `localStorage` under `dota-local:prefs`.

---

## 14. Dev workflow

```bash
cd web
npm install

# Build / typecheck — safe to run in CI
npm run build
npx tsc --noEmit
```

**Do not start `npm run dev` on your own.** The owner's global CLAUDE.md enforces this:

> **NEVER run development servers automatically (npm run dev, etc.) unless explicitly asked by the user.**

Report to the owner when a milestone is ready; they'll spin up `dev` to verify.

Backend side: the owner runs `py -m dota_local api serve` — port 8000, CORS already wired.

---

## 15. Milestones

Redesign-first. Ship F0–F2 and hand back for review.

| # | Goal                                                                              |
|---|-----------------------------------------------------------------------------------|
| F0 | Scaffold: Vite + React + TS + Tailwind + QueryClient + Router. Implement the design tokens in § 3. |
| F1 | Matches page: Header with AccountSwitcher + PullNew stub, horizontal FilterBar with chip popovers (Result / Mode / My Hero / With / Against / Date range), comfortable MatchTable with the default columns in § 10, SummaryStrip. **No right rail yet.** |
| F2 | Right rail: HeroStatsPanel, TeammatesPanel, ActivityHeatmap — all three backed by `/api/stats/*`. Click-to-filter from teammates panel. |
| F3 | Match detail page (`/match/:id`): scoreboard grid, net worth chart, draft strip, builds. Skip kill feed + lane outcomes until backend supports them. |
| F4 | Advanced filters in the `+ Add filter` menu: Duration, Party, Position, Rank range, Parsed-only, Leaver-only. |
| F5 | Saved views — serialize a filter + column config to localStorage, rename, switch between them. |
| F6 | Pull-new matches button (POST to `/api/ingest/refresh`, not yet built — coordinate with backend). |
| F7 | Hero splits page — pivot by my hero / ally hero / enemy hero. |

Anything past F5 is out of scope for the initial parallel push. **Stop at F4 and hand back for review.**

---

## 16. Style and polish notes

- **Dark theme only.** The `#080b10` base is intentional — a near-black that's gentler than pure black at night.
- **Density with breathing room**, not sardine tin. 48px rows, 20px gaps between sections, `leading-tight` for dense stat clusters only.
- **No toast spam.** Errors inline near the affected component.
- **Loading states**: `shimmer` skeletons for the table/panels, no full-page spinner ever.
- **Keyboard**: `/` focuses global hero search, `Esc` clears the focused popover, `j`/`k` navigate table rows, `Enter` opens the detail page, `Cmd/Ctrl+K` = command palette (F5+).

---

## 17. Handling ambiguity

1. **Visual / UX choices** (hover intensity, chart colours inside the palette, chip radius): decide and move on. The owner will push back on things they want different.
2. **Backend-shape questions**: pull the actual JSON from a running backend — the owner is already running it. If a field you need is missing, add a note to a `BACKEND-REQUESTS.md` at the repo root listing what's blocking you. Do **not** silently mock data.
3. **Scope creep** ("should I also build hero splits?"): stop at the milestone boundary and report back.
