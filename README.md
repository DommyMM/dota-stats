# dota-local

A personal, local-first Dota 2 analytics tool for me and a small stack of friends (< 10 accounts). Primary use case: **turbo parties** — sliced, diced, and cross-filtered in ways Stratz can in theory do, but too slowly, and Dotabuff can't do at all.

> Single user, single machine, no public deploy, no scale target. That's the whole point — I can build features that would never make sense on a public site.

---

## 1. Why build this

**Stratz** has the right filters (co-presence by `account_id`, hero×hero cross-filters, facets, IMP, laning outcome) but the web UI is painfully slow — cold queries over a huge shared DB, heavy JS, rate-limited API, referral quotas. The features are gated behind waits.

**Dotabuff** is snappy but its filtering is weak: no multi-player co-presence, no hero-with/hero-against cross-filters on a player's match list, tiny match history window.

**OpenDota** has the best free API (generous limits, arbitrary read-only SQL via `/explorer`) but its UI is again limited, and old matches drop out of the parsed index after ~2 years.

**Valve WebAPI** is authoritative for "what matches happened" but has no parsed data and no filtering UI at all.

The fix: **ingest my crew's match history into a local DuckDB file once, keep it fresh on demand, query with arbitrary SQL**. Filters return in < 100 ms because everything is local and columnar. Since it's single-user, I can ship features a public site never would — session-tilt detection, per-friend win-rate ranking, chat-log grep, muted-player impact analysis, etc.

### Scope

- **Game modes I actually play:** turbo (`game_mode = 23`) is primary. All-pick and ranked captured too but filters default to turbo.
- **Party-first:** almost every game is with a stack. The co-presence filter is the headline feature.
- **Tracked accounts:** me + ≤ 10 friends. API budget is a non-issue at this size.
- **Refresh model:** on-demand only — a "pull new matches" button. No background poller, no cron.
- **Retention:** keep everything locally forever (OpenDota purges old parsed data; I won't).

---

## 2. Landscape reference

Summary of what each upstream gives me, so the ingest strategy makes sense:

### OpenDota — `api.opendota.com/api` ([docs](https://docs.opendota.com/))

- REST, free. ~60k calls/month unauth; with a `$5/mo` key, the cap effectively goes away.
- Most useful endpoints:
  - `GET /players/{id}/matches` — full match list. Supports `hero_id`, `is_radiant`, `with_hero_id`, `against_hero_id`, `included_account_id`, `excluded_account_id`, `with_account_id`, `game_mode`, `lobby_type`, `date`, `patch`, `significant=0`, `project=<field>`. Paginates via `less_than_match_id`.
  - `GET /matches/{id}` — full detail if parsed (`version` non-null). Items, abilities, draft, objectives, chat, teamfights, runes, ward log.
  - `POST /request/{id}` — trigger a parse job for a match.
  - `GET /explorer?sql=…` — arbitrary read-only Postgres. Powerful escape hatch.
  - `/heroStats`, `/heroes`, `/constants/*` — metadata.

### Stratz — `api.stratz.com/graphql`

- GraphQL. Bearer JWT auth. **Every request must include `User-Agent: STRATZ_API`** — missing it gets you blocked.
- Token tiers (as of 2026-04):

  | Tier             | How to get              | Per sec | Per min | Per hr | Per day | Referrals / mo |
  |------------------|-------------------------|---------|---------|--------|---------|----------------|
  | Default          | Log in with Steam       | 20      | 250     | 2 000  | 10 000  | —              |
  | Individual       | Application             | 20      | 250     | 4 000  | 20 000  | 1 000          |
  | Multi (per user) | Application, desktop apps | 20    | 20      | 50     | 100     | 5 000          |

  **Default tier is plenty** for a single-user tool over ≤ 10 accounts — 10k calls/day is orders of magnitude more than any on-demand refresh needs.
- Match queries return up to 100 matches per call.
- **Unique fields worth merging** (not in OpenDota): IMP (Individual Match Performance), smurf/alt flags, toxicity score, parsed draft ordering with pick/ban sequence, facet stats, guild metadata, laning outcome per lane, predicted-win curves.
- **ToS:** no redistribution, no use that enables cheating/scripting. "Powered by STRATZ" attribution appreciated but not required on Default. Keep the token out of git — store only in `.env`, add `.env` to `.gitignore`.

### Valve WebAPI — `api.steampowered.com/IDOTA2Match_570/`

- `GetMatchHistory` (by `account_id`), `GetMatchDetails`, `GetHeroes`.
- Authoritative for match IDs — catches brand-new games before OpenDota indexes them.
- No parsed data. Requires a free Steam Web API key.

### Dotabuff

- No public API. Page scraping is fragile. Not worth integrating — OpenDota + Stratz covers everything Dotabuff has.

### Replay parsing — `odota/parser`, `clarity`, `manta`

- If OpenDota never indexes a match (old / private / queue overflow), download the `.dem.bz2` from Valve's `replayUrl` and parse locally. Lowest-level data — exact rune pickups, precise dewarding credit, courier kills.

### Metadata

- [`odota/dotaconstants`](https://github.com/odota/dotaconstants) — canonical hero/item/ability/patch JSON. Refresh weekly.

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Local machine                            │
│                                                                 │
│  ┌────────────┐     ┌──────────────┐     ┌──────────────────┐  │
│  │ Ingestors  │────▶│   DuckDB     │◀────│   Query API      │  │
│  │ (on-demand)│     │   (+ Parquet │     │   (FastAPI)      │  │
│  └────────────┘     │    cold)     │     └──────────────────┘  │
│        │            └──────────────┘              ▲            │
│        │                                          │            │
│  ┌─────┴─────┬──────────┬──────────┐      ┌──────┴──────┐     │
│  OpenDota   Stratz     Valve     Replay    Vite + React        │
│  REST       GraphQL    WebAPI    (odota)   SPA (local only)    │
└────────────────────────────────────────────────────────────────┘
```

### Stack

| Layer        | Choice                                  | Why                                           |
|--------------|-----------------------------------------|-----------------------------------------------|
| Language     | Python 3.12 (`py` on Windows)           | Best ecosystem for the ingest side            |
| HTTP         | `httpx` + `tenacity`                    | Async + retries                               |
| GraphQL      | `gql` with Stratz schema                | Typed queries, regen on schema drift          |
| Storage      | **DuckDB** (+ Parquet cold storage)     | Columnar, embedded, zero-admin, sub-100 ms    |
| Query safety | Raw SQL via `sqlglot` for param binding | DuckDB-native; no ORM overhead                |
| Backend      | FastAPI                                 | Trivial local HTTP over DuckDB                |
| Frontend     | **Vite + React + TanStack Table + ECharts** | Fastest to scaffold; no SSR needed for local-only |
| Replay       | `odota/parser` via Docker               | Isolated JVM, optional                        |
| Orchestration| `docker-compose.yml` (optional)         | Single command up                             |

**Why Vite + React over Next/Svelte:** it's local-only — no SSR, no SEO, no streaming. Vite + React is the lowest-ceremony option with the widest component ecosystem (TanStack Table is best-in-class for the kind of filter-heavy match list this app is). SvelteKit is a fine alternative if I get tired of React boilerplate.

**Why DuckDB over Postgres:** no server to run, columnar scans over 100k+ matches finish in milliseconds, reads Parquet directly for cold storage. Only reason to prefer Postgres would be mirroring OpenDota's schema 1:1 to paste their `/explorer` queries — but I can translate SQL easily enough.

---

## 4. Data model

DuckDB schema (abbreviated — full DDL lives in `schema/`):

```sql
players(
  account_id       BIGINT PRIMARY KEY,
  persona          TEXT,
  rank_tier        INTEGER,
  last_updated     TIMESTAMP,
  is_tracked       BOOLEAN         -- me + friends
)

matches(
  match_id         BIGINT PRIMARY KEY,
  start_time       TIMESTAMP,
  duration         INTEGER,
  game_mode        INTEGER,         -- 23 = turbo
  lobby_type       INTEGER,
  patch            INTEGER,
  region           INTEGER,
  radiant_win      BOOLEAN,
  avg_rank_tier    INTEGER,
  parse_status     TEXT,            -- 'unparsed' | 'pending' | 'parsed'
  source           TEXT,            -- 'opendota' | 'stratz' | 'replay'
  replay_url       TEXT
)

match_players(
  match_id         BIGINT,
  player_slot      INTEGER,
  account_id       BIGINT,
  hero_id          INTEGER,
  is_radiant       BOOLEAN,
  kills            INTEGER,
  deaths           INTEGER,
  assists          INTEGER,
  gpm              INTEGER,
  xpm              INTEGER,
  last_hits        INTEGER,
  denies           INTEGER,
  hero_damage      INTEGER,
  tower_damage     INTEGER,
  hero_healing     INTEGER,
  net_worth        INTEGER,
  level            INTEGER,
  lane             INTEGER,
  lane_role        INTEGER,
  position         INTEGER,
  facet_id         INTEGER,
  party_id         BIGINT,
  party_size       INTEGER,
  leaver_status    INTEGER,
  imp              REAL,            -- from Stratz
  rank_tier        INTEGER,
  PRIMARY KEY (match_id, player_slot)
)

match_player_items(match_id, player_slot, slot_idx, item_id, ts_purchased)
match_player_abilities(match_id, player_slot, ability_id, level, time)
match_draft(match_id, order_idx, is_pick, is_radiant, hero_id, player_slot)
match_objectives(match_id, time, type, value, slot)
match_chat(match_id, time, slot, type, text)
match_teamfights(match_id, start_ts, end_ts, deaths)

-- Metadata, refreshed from dotaconstants
heroes(hero_id, name, localized_name, primary_attr, roles JSON, facets JSON)
items(item_id, name, cost, …)
abilities(ability_id, name, is_ultimate, …)
patches(id, name, date)
```

Indexes on `(account_id, start_time)`, `(hero_id)`, `(match_id)`, `(party_id)`.

---

## 5. Ingestion

All ingestion runs **on-demand** via a CLI or UI button. No schedulers, no background workers.

### 5.1 Seed (first run)

```bash
py -m dota_local.ingest seed --account-id <me> --account-id <friend1> …
```

1. For each tracked `account_id`, page through `GET /players/{id}/matches?significant=0` (OpenDota) via `less_than_match_id` until exhausted.
2. Upsert into `matches` and `match_players` (basic fields only).
3. Log progress; resumable on crash via `last_seen_match_id` per account.

### 5.2 Enrichment

```bash
py -m dota_local.ingest enrich [--since <date>] [--limit N]
```

For each match with `parse_status != 'parsed'`:

1. `GET /matches/{id}` on OpenDota. If `version` is non-null → ingest full detail (items, abilities, draft, objectives, chat, teamfights).
2. If unparsed and recent → `POST /request/{id}`, mark `pending`, re-check on next run.
3. If the field set from Stratz is wanted (IMP, smurf flag, facet, laning outcome) → single GraphQL call, merge on `match_id`.
4. If Valve has purged the match from OpenDota → fall back to `GetMatchDetails` for at least roster/score.

### 5.3 Refresh (day-to-day)

```bash
py -m dota_local.ingest refresh    # "pull new matches since last run"
```

Per tracked account, `GetMatchHistory` (Valve) → diff against local `match_players.match_id` → ingest basics for new IDs, then run enrichment over the new set. With ≤ 10 accounts this is dozens of API calls, not thousands.

### 5.4 HTTP layer

- Single async `httpx.AsyncClient` with a per-host token bucket. Budgets reflect each upstream's real limits:
  - **Stratz:** 20/s, 250/min, 2 000/hr, 10 000/day (Default tier). Send `User-Agent: STRATZ_API` + `Authorization: Bearer <token>`.
  - **OpenDota:** unauth 60k/month; with paid key ($5/mo) effectively unlimited. Single bucket at ~60 req/min is safe.
  - **Valve WebAPI:** ~100k/day — not a concern at this scale.
- On-disk response cache keyed by `(url, query_hash)` — helps reruns and development massively.
- Default upstream is OpenDota; Stratz only called for fields OpenDota doesn't expose (IMP, smurf, facet, laning outcome).

---

## 6. Query layer & UI

### 6.1 Filter primitives

Every filter compiles to a WHERE clause against `match_players`:

- `account_id IN (…)` — the "me" pin
- **Co-presence (the headline filter):**
  ```sql
  match_id IN (
    SELECT match_id FROM match_players
    WHERE account_id IN (:allies)
      AND is_radiant = :me_is_radiant
    GROUP BY match_id
    HAVING COUNT(DISTINCT account_id) = :n_allies
  )
  ```
  Same pattern with `is_radiant != :me_is_radiant` → "**against** these accounts".
- `hero_id IN (…)` for me / teammates / enemies (subqueries on the same shape)
- `game_mode`, `lobby_type`, `patch`, `party_size`, `avg_rank_tier` ranges
- `start_time BETWEEN`, `duration BETWEEN`
- Item-in-final-build, ability-learned-at-level, facet chosen
- `win`, `imp > X`, `leaver_status = 0`, `parse_status = 'parsed'`

10-way filters over 100k matches return in < 100 ms in DuckDB.

### 6.2 Saved views

Filter specs serialize to YAML → named views. Raw SQL escape hatch for power use.

### 6.3 UI pages (Vite + React)

1. **Match list** — primary view. Sidebar of filters, table + summary strip (W/L, WR, avg GPM, IMP, KDA).
2. **Hero splits** — same filter set, grouped by my hero / teammate hero / enemy hero (pivot).
3. **Party explorer** — auto-detect every stack I've been in (cluster by `party_id` + co-occurrence), per-stack WR.
4. **Session / timeline** — calendar heatmap, tilt detector (see §7).
5. **Draft lab** — given a 5v5 turbo draft, show my record in near-neighbor historical drafts.
6. **Raw SQL** — DuckDB console for ad-hoc.

Jupyter + saved SQL snippets can carry the first few milestones if I want to skip the frontend early on.

---

## 7. Power features — the actual reason to build this

These are things a public site wouldn't or couldn't ship. Ordered roughly by value to me:

1. **Unlimited multi-player intersections.** Stratz caps how many account filters stack; locally there's no reason to.
2. **"Who on my friends list makes me lose?"** — rank every account I've queued with by adjusted win-rate (Bayesian shrinkage controlling for hero, rank, party size, game mode). Same for "against" → opponent accounts I have a real edge or deficit vs. Turbo-only view is particularly interesting — the meta is different.
3. **Session / tilt detector.** Cluster matches into sessions by inter-match gap (< 45 min). WR vs session length, WR after a loss streak ≥ N, WR by hour-of-day, WR on day-of-week. Deeply personal, useless at scale.
4. **Smurf / alt linking.** Cluster accounts that repeatedly party together with similar MMR trajectories — guess which Stratz-flagged smurfs belong to which main.
5. **Hero pair synergy on *my* account.** Most sites show global synergy; I want my WR on hero X *when my ally picks Y*, in my sample. Bayesian prior = global WR, posterior = my games. Surface statistically significant deviations from the global baseline.
6. **Draft-regret model.** Gradient-boosted model on my parsed matches: features = draft state at each pick, target = win. After each loss, replay the draft and show which of my picks had the lowest win-probability delta. Overfits hard to my pool — that's fine, it's for me.
7. **Personal item-timing benchmarks.** Per hero I play, my own p50 / p90 timings for key items, compared per-match to my personal baseline. Global benchmarks are useless at my MMR band; mine aren't.
8. **Replay auto-parse queue.** Use Valve's `replayUrl`, download `.dem.bz2`, run `odota/parser` locally. Fill in fields neither OpenDota nor Stratz exposes (exact rune pickups, precise ward dewarding credit, courier kills).
9. **Chat-log grep.** Search all chat across my match history — find that specific `?` from three weeks ago. Nobody else wants this; I do.
10. **Mute-list effectiveness.** Tag accounts I've muted/reported; check if my WR when queued with them is statistically worse.
11. **Custom transparent IMP.** Stratz's IMP is a black box. Re-implement with a logistic regression on gold/xp leads, objective damage, teamfight participation — weights tunable, per-player contribution scores I actually trust.
12. **Discord session summary.** When I've gone idle for > 30 min after my last match, post a webhook with WR, best/worst hero, tilt warning if session > 6 hours or last 3 losses.
13. **Indefinite retention.** OpenDota drops parsed detail after ~2 years. I keep mine forever as Parquet.
14. **Cross-patch lane diff.** For a given hero, show how my lane outcome distribution shifts between patches — my own patch-notes reaction.
15. **Turbo-specific item-timing curves.** Turbo has doubled gold/XP, free courier, halved respawns → item timings and build orders diverge meaningfully from all-pick. A dedicated turbo view (benchmarks, "did you go X item later than your own p50?") is more useful than general item analytics.

---

## 8. Milestones

| # | Goal                                                                              | Est.    |
|---|-----------------------------------------------------------------------------------|---------|
| M0 | Scaffold: repo, `docker-compose.yml`, DuckDB file, config (`.env` with Steam IDs + OpenDota/Stratz/Valve keys). | 1 day   |
| M1 | OpenDota ingest: full match list for tracked accounts, schema, upserts, resumable paginator. | 2–3 days |
| M2 | Enrichment: `/matches/{id}` detail, `/request/{id}` parse requests, item/ability/draft tables. | 2 days  |
| M3 | Query API + minimal UI: FastAPI endpoints, Vite + React filter sidebar + TanStack Table. | 3 days  |
| M4 | **Co-presence & hero-cross filters + saved views.** Headline feature.              | 1–2 days |
| M5 | Stratz GraphQL merge: IMP, facets, smurf flags, laning outcome.                    | 2 days  |
| M6 | On-demand refresh CLI + "pull new" button in UI. (No scheduler.)                   | 0.5 day |
| M7 | Power features pick-list: tilt detector, friend-WR ranker, personal item benchmarks (§7 #2, #3, #7). | 3–4 days |
| M8 | Turbo-specific views (item-timing curves, build-order distributions, §7 #15).      | 1–2 days |
| M9 | Optional: local replay parser pipeline (§7 #8).                                    | 2–3 days |
| M10 | Optional: draft-regret model (§7 #6).                                             | 2 days  |

---

## 9. Risks & notes

- **Stratz ToS:** Default-tier token is enough; no referrals required at this tier. Don't redistribute Stratz data. Always send `User-Agent: STRATZ_API`. Keep the JWT in `.env` only.
- **OpenDota parse queue:** sometimes slow for old matches. Accept that some matches stay unparsed and fall back to basic fields.
- **Privacy:** matches from players with "Expose Match Data" disabled 404 on detail endpoints. Handle gracefully; basic fields from `GetMatchHistory` still work.
- **Stratz schema drift:** regenerate GraphQL types weekly via `gql` codegen, or pin to a known-good schema snapshot and bump deliberately.
- **Disk:** parsed match ≈ 200–500 KB JSON; 100k matches ≈ 30 GB raw, ~3 GB columnar Parquet. Fine.
- **Windows-isms:** Python is `py`, not `python3`. Paths are Windows but shell is bash — use forward slashes.

---

## 10. Getting started (forward-looking)

```bash
# clone & enter
cd Dota

# Python env
py -m venv .venv
.venv/Scripts/activate
py -m pip install -r requirements.txt

# Config
cp .env.example .env
# Fill in: OPENDOTA_API_KEY, STRATZ_TOKEN, STEAM_WEB_API_KEY, TRACKED_ACCOUNT_IDS

# One-time seed (will take a while for a full history)
py -m dota_local.ingest seed

# Enrich in the background
py -m dota_local.ingest enrich

# Start API + UI
py -m dota_local.api &          # FastAPI on :8000
cd web && npm run dev           # Vite on :5173
```

---

## 11. Open questions (resolved)

- ~~Postgres vs DuckDB?~~ → **DuckDB**.
- ~~Real-time or on-demand?~~ → **On-demand only**. Press a button, pull new matches, done.
- ~~How many friend accounts?~~ → **≤ 10**. API budget is trivial at this size.
- ~~Frontend necessary?~~ → Start with **Jupyter + saved SQL** for M1–M3, then **Vite + React** from M4 onward. SvelteKit is a backup if React ergonomics become annoying.
