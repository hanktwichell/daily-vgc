# Daily VGC recorder

A Cloudflare Worker with a D1 database (both free tier) that collects one anonymous result per
browser for each day's battles and serves the daily community stats shown before the next
puzzle.

| Endpoint | What it does |
| --- | --- |
| `POST /result` | A finished battle (`BattleSubmission` in `src/shared/community.ts`). Accepted only for today's puzzle, or yesterday's for 3 hours after midnight. Archive replays aren't sent. |
| `GET /stats/:puzzle` | `CommunityStats` for a finished puzzle: win rate, Pokémon left, pick rates and the best four. Recomputed every 10 minutes until late results stop, then fixed. |
| `GET /players` | `PlayerCount`: how many browsers have a result on today's puzzle so far (either mode). Shown in the site footer; counted at most once a minute. |
| `GET /export/:puzzle` | Raw results for a finished puzzle. Needs `Authorization: Bearer <ADMIN_TOKEN>`. |

**Stored per battle:** puzzle, mode (daily or hard), win or loss, Pokémon left, turns, the four
brought (team indices, in pick order), the six species, the site build, a random per-browser id
and a salted hash of the IP, used only to cap submissions at 20 per address per puzzle. No names
or accounts. Only results reporting the puzzle's real team (the most common one) count toward
the stats.

## Deploying

The **Deploy recorder** GitHub Action (`.github/workflows/recorder.yml`) does everything. It
applies `schema.sql`, deploys the Worker, saves its URL in `recorder.json` and triggers a site
rebuild. It runs on changes to `recorder/` and can be started by hand from the Actions tab. It
needs these repository secrets (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN`: create one under My Profile → API Tokens from the **Edit Cloudflare
  Workers** template, and add the permission **Account → D1 → Edit**.
- `CLOUDFLARE_ACCOUNT_ID`: shown on the Workers & Pages overview page.
- `RECORDER_ADMIN_TOKEN` (optional): any long random string. It enables `/export`, so the daily
  **Archive community stats** Action can save per-battle results to `community/battles/`.

The D1 database (`dailyvgc`) is set in `wrangler.toml`. The account also needs a workers.dev
subdomain, which Cloudflare asks you to pick the first time you open Workers & Pages.

## Local development

```sh
cd recorder && npm install
npx wrangler d1 execute dailyvgc --local --file=schema.sql
npx wrangler dev --local --var NOW:2026-10-13T15:00:00Z   # NOW pretends it's that time
# in another shell, from the repo root:
VITE_RECORDER_URL=http://localhost:8787 npm run build && npm run preview
node scripts/e2e-community.mjs http://localhost:4173/
```
