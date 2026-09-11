import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Missing DATABASE_URL. Copy .env.example to .env and paste your Neon connection string.");
    process.exit(1);
  }

  const sql = neon(url);

  await sql`
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
    )
  `;
  console.log("OK: players table");

  await sql`CREATE INDEX IF NOT EXISTS players_best_score_idx ON players (best_score DESC)`;
  console.log("OK: best_score index");

  await sql`CREATE INDEX IF NOT EXISTS players_updated_at_idx ON players (updated_at DESC)`;
  console.log("OK: updated_at index");

  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS auth_token_hash TEXT`;
  console.log("OK: auth_token_hash column");

  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS daily_meta JSONB NOT NULL DEFAULT '{}'::jsonb`;
  console.log("OK: daily_meta column");

  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0)`;
  console.log("OK: coins column");

  await sql`
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
    )
  `;
  console.log("OK: daily_results table");

  await sql`
    CREATE INDEX IF NOT EXISTS daily_results_date_score_idx
    ON daily_results (date_key, daily_score DESC, time_seconds ASC)
  `;
  console.log("OK: daily_results index");

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS players_auth_token_hash_idx
    ON players (auth_token_hash)
    WHERE auth_token_hash IS NOT NULL
  `;
  console.log("OK: auth_token_hash index");

  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      rate_key TEXT PRIMARY KEY,
      hits INTEGER NOT NULL DEFAULT 0 CHECK (hits >= 0),
      window_start TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log("OK: rate_limits table");

  await sql`
    CREATE INDEX IF NOT EXISTS rate_limits_window_idx
    ON rate_limits (window_start)
  `;
  console.log("OK: rate_limits index");

  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
