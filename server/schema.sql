-- Math Rescue players (Neon Postgres)
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  unlocked_board INTEGER NOT NULL DEFAULT 1 CHECK (unlocked_board >= 1),
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
  best_stars INTEGER NOT NULL DEFAULT 0 CHECK (best_stars >= 0),
  board_stars JSONB NOT NULL DEFAULT '{}'::jsonb,
  coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  tutorial_seen BOOLEAN NOT NULL DEFAULT false,
  auth_token_hash TEXT,
  daily_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS players_best_score_idx ON players (best_score DESC);
CREATE INDEX IF NOT EXISTS players_updated_at_idx ON players (updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS players_auth_token_hash_idx
  ON players (auth_token_hash)
  WHERE auth_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS daily_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_key TEXT NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  username_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  daily_score INTEGER NOT NULL CHECK (daily_score >= 0),
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 3),
  time_seconds INTEGER NOT NULL CHECK (time_seconds >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (date_key, player_id)
);

CREATE INDEX IF NOT EXISTS daily_results_date_score_idx
  ON daily_results (date_key, daily_score DESC, time_seconds ASC);

CREATE TABLE IF NOT EXISTS rate_limits (
  rate_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL DEFAULT 0 CHECK (hits >= 0),
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits (window_start);
