// Offline difficulty calibration. For each puzzle date, simulates the best few candidate player
// teams against the opponent (AI vs AI, plus a greedy "casual" player) and records the candidate
// whose results are closest to the targets in src/data/calibrated.json. It does the same for the
// hard-mode pairing (the day's themed team against a meta team).
// Usage: tsx scripts/calibrate.ts <fromPuzzle> <toPuzzle> [outFile] [--force]
//        tsx scripts/calibrate.ts --upcoming <days> [outFile] [--shard=i/n]   (the next <days> puzzles after today)
// Dates already calibrated are skipped, and today's and past puzzles are never changed, so players
// never see a puzzle change mid-day. Pass --force (with explicit numbers) to override.
import '../src/engine/ps-node';
import fs from 'node:fs';
import { candidateTeams, hardCandidates, dateForPuzzleNumber, opponentForPuzzle, puzzleDateFor, puzzleNumberFor } from '../src/data/daily';
import { buildTeam } from '../src/data/team-builder';
import { DEFAULT_AI, type AIConfig } from '../src/engine/ai';
import { playGame } from './simulate';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const force = process.argv.includes('--force');
const shardArg = process.argv.find(a => a.startsWith('--shard='));
const [shard, shards] = shardArg ? shardArg.slice(8).split('/').map(Number) : [0, 1];
const today = puzzleNumberFor(puzzleDateFor());
let from: number, to: number, outFile: string;
if (process.argv.includes('--upcoming')) {
	from = today + 1;
	to = today + Number(args[0] || 14);
	outFile = args[1] || 'src/data/calibrated.json';
} else {
	from = Number(args[0] || 1);
	to = Number(args[1] || from);
	outFile = args[2] || 'src/data/calibrated.json';
}
const fast: AIConfig = { ...DEFAULT_AI, ownJoint: 7, oppJoint: 5, refineTop: 0 };
const MAX_CANDIDATES = 6, GREEDY_GAMES = 3, AI_GAMES = 2, HARD_CANDIDATES = 3, HARD_GAMES = 2;
// Daily battle targets: a greedy "casual" player rarely wins; a search-AI player wins a bit under half.
const GREEDY_TARGET = 0.15, AI_TARGET = 0.45;
// Hard mode target: a search-AI player piloting the themed team wins about a third of the time.
const HARD_TARGET = 0.35;

const out: Record<string, any> = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const save = () => fs.writeFileSync(outFile, JSON.stringify(out, null, '\t') + '\n');
const wins = (n: number, play: () => { winner?: string }) => {
	let w = 0;
	for (let g = 0; g < n; g++) if (play().winner === 'Player') w++;
	return w;
};

for (let n = from; n <= to; n++) {
	const date = dateForPuzzleNumber(n);
	const entry = out[date] ?? {};
	if (!force && ((entry.ids && entry.hard) || n <= today)) continue;
	if (n % shards !== shard) continue;
	const opponent = opponentForPuzzle(n);
	const oppTeam = buildTeam(opponent.sets);

	if (force || !entry.ids) {
		// Best by quick score first, but alternate archetypes so a bad plan doesn't fill every slot.
		const all = candidateTeams(date, oppTeam, opponent, true);
		const byArch = new Map<string, typeof all>();
		for (const c of all) byArch.set(c.archetype, [...(byArch.get(c.archetype) ?? []), c]);
		const cands: typeof all = [];
		for (let i = 0; cands.length < MAX_CANDIDATES && i < 20; i++) {
			for (const list of byArch.values()) if (list[i] && cands.length < MAX_CANDIDATES) cands.push(list[i]);
		}
		let best: { score: number; ids: string[]; archetype: string; ai: number; greedy: number } | null = null;
		for (const c of cands) {
			const greedy = wins(GREEDY_GAMES, () => playGame(c.team, oppTeam, { p1Greedy: true, p2Config: fast }));
			const ai = wins(AI_GAMES, () => playGame(c.team, oppTeam, { p1Config: fast, p2Config: fast }));
			const score = Math.abs(greedy / GREEDY_GAMES - GREEDY_TARGET) + Math.abs(ai / AI_GAMES - AI_TARGET) + 0.15 * c.diff;
			console.log(`#${n} ${opponent.id} ${c.archetype} greedy ${greedy}/${GREEDY_GAMES} ai ${ai}/${AI_GAMES} diff ${c.diff.toFixed(2)} :: ${c.ids.join(',')}`);
			if (!best || score < best.score) best = { score, ids: c.ids, archetype: c.archetype, ai, greedy };
			// Good enough: a strong player can win, a careless one usually loses.
			if (greedy <= 1 && ai === 1) break;
		}
		entry.ids = best!.ids;
		entry.archetype = best!.archetype;
		console.log(`=> #${n} ${date}: greedy ${best!.greedy}/${GREEDY_GAMES} ai ${best!.ai}/${AI_GAMES}`);
		out[date] = entry;
		save();
	}

	if (force || !entry.hard) {
		let best: { score: number; id: string; ai: number } | null = null;
		for (const c of hardCandidates(oppTeam).slice(0, HARD_CANDIDATES)) {
			const ai = wins(HARD_GAMES, () => playGame(oppTeam, c.team, { p1Config: fast, p2Config: fast }));
			const score = Math.abs(ai / HARD_GAMES - HARD_TARGET) + 0.15 * c.diff;
			console.log(`#${n} hard ${opponent.id} vs ${c.meta.id} ai ${ai}/${HARD_GAMES} score ${c.score.toFixed(2)}`);
			if (!best || score < best.score) best = { score, id: c.meta.id, ai };
			if (ai === 1) break;
		}
		entry.hard = best!.id;
		// If the themed team lost every test game, soften that day's AI so it stays beatable.
		if (best!.ai === 0) entry.hardRelaxed = true;
		else delete entry.hardRelaxed;
		console.log(`=> #${n} ${date} hard: ${best!.id} ai ${best!.ai}/${HARD_GAMES}${entry.hardRelaxed ? ' (relaxed AI)' : ''}`);
		out[date] = entry;
		save();
	}
}
