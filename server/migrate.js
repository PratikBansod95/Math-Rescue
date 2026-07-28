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

  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
