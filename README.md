# Math Rescue

Card equation puzzle — match the target with four number cards before the shark catches the cat.

**Live:** [math-rescue-mu.vercel.app](https://math-rescue-mu.vercel.app)

## Features

- **Journey mode** — level-based progression with stars, hints, and a journey map
- **Rescue Brain** — built-in adaptive AI: tracks skill, generates unique journey puzzles after built-in variants are exhausted, tunes retries
- **Rescue League** — global career ranks
- **Cloud sync** — progress saved to Neon Postgres when online; offline play via localStorage

## Local development

1. Copy env file and add your Neon connection string:

```bash
cp .env.example .env
```

2. Install dependencies and create database tables:

```bash
npm install
npm run db:migrate
```

3. Run the game + API:

```bash
npm start
```

Open http://localhost:5173

**Dev with auto-reload:**

```bash
npm run dev
```

**Tests:**

```bash
npm test
```

**Regenerate Daily Challenge puzzle bank** (procedural tough generator; optional AI assist):

```bash
npm run daily:generate
OPENAI_API_KEY=sk-... npm run daily:generate -- --ai=10
```

Daily puzzles live in `public/js/data/daily-challenges.data.js` — separate from journey levels. The app picks one puzzle per UTC day from this bank (same puzzle for everyone that day). AI is used offline in the generator script, not at runtime in the browser.

## Neon setup

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string into `.env` as `DATABASE_URL`
3. Run `npm run db:migrate`
4. Confirm with `GET http://localhost:5173/api/health`

## Vercel deployment

1. Import the GitHub repo into Vercel
2. Set environment variable `DATABASE_URL` to your Neon connection string
3. Deploy (static files from `public/`, API from `api/`)
4. **After first deploy or schema changes**, run migrations against production:

```bash
DATABASE_URL="your-production-neon-url" npm run db:migrate
```

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Service health check |
| `/api/leaderboard` | GET | Career leaderboard (`?limit=25`) |
| `/api/players/register` | POST | Register nickname, returns player id + token |
| `/api/players/:username` | GET | Fetch player profile |
| `/api/players/:username` | PUT | Save progress (Bearer token required) |
| `/api/players/:username` | DELETE | Delete player (Bearer token required) |

The game keeps a localStorage cache and syncs progress to Neon when online. Leaderboard / Top Players read from Neon when available.

## Architecture

- **Frontend:** Vanilla JS SPA in `public/` (no bundler)
- **Local API:** `server/index.js` serves static files + all routes on port 5173
- **Production API:** Vercel serverless functions in `api/` share logic from `server/`
- **Database:** Neon Postgres via `@neondatabase/serverless`

## Privacy

See [public/privacy.html](public/privacy.html) (also at `/privacy.html` when deployed).

## Notes

- Identity is username-only for MVP (no passwords); each device stores a bearer token
- Progress merges never go backwards (`unlocked_board`, scores, stars)
- Offline play works from localStorage; sync runs when online
- Daily Challenge locks for 24 hours (UTC) after one attempt; **+5 career points** only on a successful solve
