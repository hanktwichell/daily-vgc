# Daily VGC

**Play at [dailyvgc.online](https://dailyvgc.online)**

A daily Pokémon double-battle puzzle, in the spirit of Wordle and Travle. Every day at
midnight Eastern a new battle appears: you get six Pokémon, pick four, and take on a
computer trainer whose team always includes a Mega Evolution. Win or lose, share your
result with friends:

```
Daily VGC #1
🟩🟩🟥🟩 3/4 left · 16 turns
Streak: 1 · #DailyVGC
dailyvgc.online
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
   (so it handles EST/EDT) and the puzzle number (#0 = `LAUNCH_DATE`, October 12, 2026; #1 is October 13).
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

## Hard Mode

Finishing the daily battle, win or lose, unlocks Hard Mode. You pilot the day's themed opponent team against
one of 16 competitive teams built on the cores winning Regulation M-C (`src/data/meta-teams.ts`).
Everyone gets the same meta team on a given day. It's chosen so it's favoured on paper but
doesn't overwhelm the themed team, and the weekly calibration checks it by simulation too. If even
the best pairing is lopsided, that day's AI plays a little looser so it stays winnable. Hard Mode
has its own progress, stats and share text ("Daily VGC #N (Hard Mode)").

## Playing again

Only the first try at each battle counts. After that, the daily battle and Hard Mode can each
be replayed as often as you like from their results screens ("Play again"). A replay has its
own saved progress, a "(Replay)" share text and no effect on stats, streaks, the archive
calendar or the community stats.

## Archive

Once a day's battle is over, it moves to the **Archive** (calendar icon; reach it from the stats
screen or the results screen). Every past puzzle, daily and Hard Mode, can be played again.
Archive games have their own saved progress and results (`dailyvgc:archive*` in `localStorage`)
and never touch the main stats or streak. In the calendar, gold with a crown means won on the day,
green means won from the archive, white means not played yet, and grey marks the puzzle being
played now.

## Community stats

Each battle played on its own day (daily and Hard Mode, not archive replays) is reported
anonymously to a small recorder: a Cloudflare Worker + D1 database in `recorder/`. It stores the
result, how many Pokémon survived, which four were brought, and no personal data. Before each
new day's battle the site shows **Yesterday's battle**: the overall win rate, the
Perfect/3/4/2/4/1/4/Loss chart, how often each Pokémon was picked, and the four with the best win
rate (pick order doesn't matter). It's also under "Yesterday's results" in the stats screen.
Stats for a puzzle only appear once its day is over, so they update once a day. The one live
number is the footer's count of players who have finished today's battle, named after the
class of the day's themed trainer ("143 Bug Catchers today" against Bug Catcher Rick; each
team's `players` in `src/data/opponents.ts`). A daily Action
copies them into `community/`. Setup and deployment are covered in [recorder/README.md](recorder/README.md).
The site works normally with no recorder configured.

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
- Its last Pokémon doesn't fish for double Protects. A Protect straight after another is only
  considered when the stalled turn is worth something: blocking a charged attack that would
  end the game, running out the last turns of your weather, terrain, screens, Tailwind or
  Trick Room, passive healing, passive damage on your side (poison, burn, Leech Seed, a
  perish count...) or draining your last PP. Even then it has to change what happens next turn.
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
node scripts/e2e-archive.mjs http://localhost:4173/ [screenshotDir] [--mobile]      # archive flow, with a faked clock
node scripts/e2e-community.mjs http://localhost:4173/ [screenshotDir] [--mobile]    # community recap (needs a local recorder)
node scripts/e2e-replay.mjs http://localhost:4173/ [screenshotDir] [--mobile]       # replays and Hard Mode after a loss, with a faked clock
```

## Changing things

- **Launch date / puzzle numbering:** `LAUNCH_DATE` in `src/data/calendar.ts`.
- **Add a set:** append a block to `src/data/sets-library.ts` (Showdown format, `EVs:` are
  Stat Points, `@ A / B` lists fallback items), then run `npm run validate-teams`. If it is a
  new species, run `npm run gen:sprites`.
- **Add an opponent team:** add an entry to `src/data/opponents.ts` with exactly one Mega. Its
  `players` is the trainer's class, singular and plural, for the footer's player count.
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
