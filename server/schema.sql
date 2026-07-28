-- Math Rescue players (Neon Postgres)
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  unlocked_board INTEGER NOT NULL DEFAULT 1 CHECK (unlocked_board >= 1),
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
  best_stars INTEGER NOT NULL DEFAULT 0 CHECK (best_stars >= 0),
  board_stars JSONB NOT NULL DEFAULT '{}'::jsonb,
  tutorial_seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS players_best_score_idx ON players (best_score DESC);
CREATE INDEX IF NOT EXISTS players_updated_at_idx ON players (updated_at DESC);
