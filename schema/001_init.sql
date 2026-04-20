-- dota-local initial schema. Idempotent; safe to re-run.
-- Source of truth for the data model is README §4.

CREATE TABLE IF NOT EXISTS players (
    account_id    BIGINT PRIMARY KEY,
    persona       TEXT,
    rank_tier     INTEGER,
    last_updated  TIMESTAMP,
    is_tracked    BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS matches (
    match_id       BIGINT PRIMARY KEY,
    start_time     TIMESTAMP,
    duration       INTEGER,
    game_mode      INTEGER,      -- 23 = turbo
    lobby_type     INTEGER,
    patch          INTEGER,
    region         INTEGER,
    radiant_win    BOOLEAN,
    avg_rank_tier  INTEGER,
    parse_status   TEXT,         -- 'unparsed' | 'pending' | 'parsed'
    source         TEXT,         -- 'opendota' | 'stratz' | 'valve' | 'replay'
    replay_url     TEXT
);

CREATE TABLE IF NOT EXISTS match_players (
    match_id       BIGINT,
    player_slot    INTEGER,
    account_id     BIGINT,
    hero_id        INTEGER,
    is_radiant     BOOLEAN,
    kills          INTEGER,
    deaths         INTEGER,
    assists        INTEGER,
    gpm            INTEGER,
    xpm            INTEGER,
    last_hits      INTEGER,
    denies         INTEGER,
    hero_damage    INTEGER,
    tower_damage   INTEGER,
    hero_healing   INTEGER,
    net_worth      INTEGER,
    level          INTEGER,
    lane           INTEGER,
    lane_role      INTEGER,
    position       INTEGER,
    facet_id       INTEGER,
    party_id       BIGINT,
    party_size     INTEGER,
    leaver_status  INTEGER,
    imp            REAL,          -- Stratz
    rank_tier      INTEGER,
    PRIMARY KEY (match_id, player_slot)
);

CREATE TABLE IF NOT EXISTS match_player_items (
    match_id      BIGINT,
    player_slot   INTEGER,
    slot_idx      INTEGER,
    item_id       INTEGER,
    ts_purchased  INTEGER,
    PRIMARY KEY (match_id, player_slot, slot_idx)
);

CREATE TABLE IF NOT EXISTS match_player_abilities (
    match_id    BIGINT,
    player_slot INTEGER,
    ability_id  INTEGER,
    level       INTEGER,
    time        INTEGER,
    PRIMARY KEY (match_id, player_slot, ability_id, level)
);

CREATE TABLE IF NOT EXISTS match_draft (
    match_id     BIGINT,
    order_idx    INTEGER,
    is_pick      BOOLEAN,
    is_radiant   BOOLEAN,
    hero_id      INTEGER,
    player_slot  INTEGER,
    PRIMARY KEY (match_id, order_idx)
);

CREATE TABLE IF NOT EXISTS match_objectives (
    match_id  BIGINT,
    time      INTEGER,
    type      TEXT,
    value     INTEGER,
    slot      INTEGER
);

CREATE TABLE IF NOT EXISTS match_chat (
    match_id BIGINT,
    time     INTEGER,
    slot     INTEGER,
    type     TEXT,
    text     TEXT
);

CREATE TABLE IF NOT EXISTS match_teamfights (
    match_id BIGINT,
    start_ts INTEGER,
    end_ts   INTEGER,
    deaths   INTEGER
);

-- Metadata (refreshed weekly from odota/dotaconstants)
CREATE TABLE IF NOT EXISTS heroes (
    hero_id         INTEGER PRIMARY KEY,
    name            TEXT,
    localized_name  TEXT,
    primary_attr    TEXT,
    roles           JSON,
    facets          JSON
);

CREATE TABLE IF NOT EXISTS items (
    item_id INTEGER PRIMARY KEY,
    name    TEXT,
    cost    INTEGER
);

CREATE TABLE IF NOT EXISTS abilities (
    ability_id  INTEGER PRIMARY KEY,
    name        TEXT,
    is_ultimate BOOLEAN
);

CREATE TABLE IF NOT EXISTS patches (
    id    INTEGER PRIMARY KEY,
    name  TEXT,
    date  TIMESTAMP
);

-- Ingest bookkeeping: resumable paginators per (account_id, source).
CREATE TABLE IF NOT EXISTS ingest_cursors (
    account_id          BIGINT,
    source              TEXT,
    last_seen_match_id  BIGINT,
    last_run_at         TIMESTAMP,
    PRIMARY KEY (account_id, source)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_match_players_account ON match_players(account_id);
CREATE INDEX IF NOT EXISTS idx_match_players_hero    ON match_players(hero_id);
CREATE INDEX IF NOT EXISTS idx_match_players_party   ON match_players(party_id);
CREATE INDEX IF NOT EXISTS idx_matches_start_time    ON matches(start_time);
CREATE INDEX IF NOT EXISTS idx_matches_game_mode     ON matches(game_mode);
