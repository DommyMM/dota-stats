-- M-Stratz: ingest Stratz's match-level + lane-level analysis tags.
-- Idempotent; safe to re-run after schema drift.

ALTER TABLE matches ADD COLUMN IF NOT EXISTS analysis_outcome TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS top_lane_outcome TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS mid_lane_outcome TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS bot_lane_outcome TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS stratz_fetched_at TIMESTAMP;
