# Daily VGC

A daily Pokémon double-battle puzzle, in the spirit of Wordle and Travle. Every day at
midnight Eastern a new battle appears: you get six Pokémon, pick four, and take on a
computer trainer whose team always includes a Mega Evolution. Win or lose, share your
result with friends:

```
Daily VGC #1
🟩🟩🟥🟩 3/4 left · 16 turns
Streak: 1 · #DailyVGC
daily-vgc.com
```

- **Rules:** Pokémon Champions, VGC 2026 Regulation M-C (doubles, Level 50, Stat Points,
  Item Clause, Species Clause, Open Team Sheets, one Mega Evolution per battle).
- **Mechanics:** battles run on the [Pokémon Showdown](https://github.com/smogon/pokemon-showdown)
  simulator's `champions` mod, so damage, abilities, items and move interactions follow
  Pokémon Champions.
- **Look:** a Diamond/Pearl/Platinum-style dual-screen UI with DS-era pixel sprites from
  [PokéAPI](https://github.com/PokeAPI/sprites). Every Pokémon and Mega uses the same
  Black/White-style set, the only one there that covers all of them, front and back.
- **Hosting:** a static site with no server and no costs. Stats and in-progress battles are
  saved in the browser (`localStorage`).

## How a day's puzzle is made

Everything about the *puzzle* is deterministic for a date, so all players get the same teams;
everything about the *battle* (damage rolls, accuracy, secondary effects, the AI's choices)
uses fresh randomness per player.

1. `src/data/calendar.ts` turns the current time into the puzzle date in `America/New_York`
   (so it handles EST/EDT) and the puzzle number (#1 = `LAUNCH_DATE`).
2. `src/data/daily.ts` picks the opponent from 41 hand-built teams in
   `src/data/opponents.ts` (shuffled per cycle so none repeats until all have been used).
3. It then builds the player's team from the 236-set library in
   `src/data/sets-library.ts`: it picks an archetype (Tailwind, Trick Room, sun, rain, sand,
   snow or balance) and 0, 1 or 2 Megas, then fills setters, abusers, support and coverage
   with Item Clause and Species Clause applied. It generates 16 candidates and keeps the one
   whose matchup score (`src/engine/matchup.ts`) is closest to a small edge for the player.
   Teams without a Mega get a bigger edge so they stay winnable.

4. **Calibration.** The quick matchup score can't see everything (Trick Room, weather and
   setup are hard to score), so upcoming puzzles are also checked by simulation.
   `npm run calibrate` plays the top three candidates against the opponent: AI vs AI, plus a
   greedy "casual player" bot. It pins the best-balanced team for each date in
   `src/data/calibrated.json`. A weekly GitHub Action (`calibrate.yml`) does this for the
   next two weeks and commits the result. Today's and past puzzles are never changed.
   Dates without an entry fall back to step 3.

Every set and team is checked against the Reg M-C validator (`npm run validate-teams`).

## The opponent AI

`src/engine/ai.ts` plays by simultaneous-move search on copies of the real battle:

- It lists legal actions for its two Pokémon and for yours, then uses Showdown's own damage
  formula to keep the most promising ones.
- It plays every pairing forward one turn on a cloned battle with a **new random seed**
  (it never sees your choice or the battle's real RNG). It scores the result on HP, KOs,
  status, boosts, Tailwind / Trick Room / screens, and how much pressure each side can
  apply next turn.
- It picks a robust move (mostly expected value against a model of a smart player, partly
  worst case) and samples among the best with a soft-max. Two players who make the same
  moves will not get the same game.
- Team preview: it picks four including its Mega, using a matchup matrix against your six,
  and leads with speed control, support and weather where it can.

In AI-vs-AI testing (`npm run balance`), a player side using the same search wins about 58%
of games. A simple greedy player that always picks the biggest-looking move wins about 23%
(`--greedy`). So a careful human should find it hard but winnable.

## Project layout

```
src/
  engine/   ps.ts (Showdown data registry), ai.ts, matchup.ts, runner.ts, text-parser.ts
  data/     sets-library.ts, opponents.ts, daily.ts, calendar.ts, library.ts, team-builder.ts
  worker/   battle.worker.ts: runs the simulator and AI off the main thread
  ui/       Preact components (team preview, battle scene and controls, results, share)
  generated/ battle-text.json, sprites.json (built by scripts)
vendor/ps/  the subset of Pokémon Showdown used here (MIT), patched to bundle for browsers
public/sprites/  front/back sprites for every Pokémon and Mega that can appear
scripts/    validation, balance simulation, e2e test, sprite/text generators
```

## Development

Requires Node 20+.

```sh
npm install
npm run dev              # local dev server
npm test                 # calendar, generator legality/determinism, save/restore, AI battle
npm run typecheck
npm run validate-teams   # every set and opponent team vs. Reg M-C
npm run build            # static site in dist/
npm run balance -- 1 20 2 [--greedy]   # AI vs AI on puzzles 1-20, 2 games each
npm run calibrate -- --upcoming 14      # simulate and pin the next 14 puzzles' player teams
node scripts/e2e.mjs http://localhost:4173/ [screenshotDir] [--mobile] [--reload]   # browser test (after `npm run preview`)
```

## Deploying for free (GitHub Pages)

The repository includes `.github/workflows/deploy.yml`, which tests, builds and publishes
the site on every push to `main`.

1. Merge this work into `main`.
2. On GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The next push to `main`, or **Actions → Deploy to GitHub Pages → Run workflow**,
   publishes to `https://hanktwichell.github.io/daily-vgc/`.

The share message uses the address the player is on. To show a different one (for example a
custom domain), add a repository variable `SITE_URL` under
**Settings → Secrets and variables → Actions → Variables**.

**Custom domain (optional, about $10/year):** buy a domain such as `daily-vgc.com`, add it
under **Settings → Pages → Custom domain**, point the DNS records at GitHub Pages as GitHub
describes, and set `SITE_URL` to the domain. The build uses relative paths, so it works at a
domain root or under `/daily-vgc/` without changes.

Other free static hosts (Cloudflare Pages, Netlify, Vercel) work too: build with
`npm run build` and publish `dist/`. No server, EC2 instance, or database is needed.

## Changing things

- **Launch date / puzzle numbering:** `LAUNCH_DATE` in `src/data/calendar.ts`.
- **Add a set:** append a block to `src/data/sets-library.ts` (Showdown format, `EVs:` are
  Stat Points, `@ A / B` lists fallback items), then run `npm run validate-teams`. If it is a
  new species, run `npm run gen:sprites`.
- **Add an opponent team:** add an entry to `src/data/opponents.ts` with exactly one Mega.
- **Update the battle engine** (new regulation, bug fixes):
  `git clone https://github.com/smogon/pokemon-showdown`, then
  `node scripts/vendor-ps.mjs ../pokemon-showdown`, update `FORMAT_ID` in `src/engine/ps.ts`
  if the format name changed, and re-run the checks. Note that changing sets, teams or the
  generator changes which teams future dates produce. Puzzles already played keep their
  results, but avoid editing them mid-day.

## Credits

Pokémon and all related names are trademarks of Nintendo, Game Freak, The Pokémon Company
and Creatures. This is a non-commercial fan project and is not affiliated with them. The
battle engine is [Pokémon Showdown](https://github.com/smogon/pokemon-showdown) (MIT). The
battle text parser is adapted from the
[Pokémon Showdown client](https://github.com/smogon/pokemon-showdown-client) (MIT). Sprites
come from [PokéAPI/sprites](https://github.com/PokeAPI/sprites).
