# Math Rescue

Card equation puzzle — match the target with four number cards.

## Local

1. Copy env file and add your Neon connection string:

```bash
cp .env.example .env
```

2. Create the database table:

```bash
npm install
npm run db:migrate
```

3. Run the game + API:

```bash
npm start
```

Open http://localhost:5173

## Neon setup

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string into `.env` as `DATABASE_URL`
3. Run `npm run db:migrate`
4. Confirm with `GET http://localhost:5173/api/health`

## Vercel

1. Import the repo
2. Set environment variable `DATABASE_URL` to your Neon connection string
3. Deploy

API routes:

- `GET /api/health`
- `GET /api/players/:username`
- `PUT /api/players/:username`
- `GET /api/leaderboard?limit=10`

The game keeps a localStorage cache and syncs progress to Neon when online. Leaderboard / Top Players read from Neon when available.

## Notes

- Identity is username-only for MVP (no passwords)
- Progress merges never go backwards (`unlocked_board`, scores, stars)
- Offline play still works from localStorage
