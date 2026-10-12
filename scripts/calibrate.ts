// Offline difficulty calibration. For each puzzle date, simulates the best few candidate player
// teams against the opponent (AI vs AI, plus a greedy "casual" player) and records the candidate
// whose results are closest to the targets in src/data/calibrated.json.
// Usage: tsx scripts/calibrate.ts <fromPuzzle> <toPuzzle> [outFile] [--force]
//        tsx scripts/calibrate.ts --upcoming <days> [outFile]   (the next <days> puzzles after today)
// Dates already calibrated are skipped, and today's and past puzzles are never changed, so players
// never see a puzzle change mid-day. Pass --force (with explicit numbers) to override.
import '../src/engine/ps-node';
import fs from 'node:fs';
import { candidateTeams, dateForPuzzleNumber, opponentForPuzzle, puzzleDateFor, puzzleNumberFor } from '../src/data/daily';
import { buildTeam } from '../src/data/team-builder';
import { DEFAULT_AI, type AIConfig } from '../src/engine/ai';
import { playGame } from './simulate';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const force = process.argv.includes('--force');
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
const fast: AIConfig = { ...DEFAULT_AI, ownJoint: 8, oppJoint: 6, refineTop: 0 };
const CANDIDATES = 4, AI_GAMES = 4, GREEDY_GAMES = 2;
// Targets: a search-AI player should win a bit more than half; a greedy player about a third.
const AI_TARGET = 0.6, GREEDY_TARGET = 0.3;

const out: Record<string, any> = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
for (let n = from; n <= to; n++) {
	const date = dateForPuzzleNumber(n);
	if (!force && (out[date] || n <= today)) continue;
	const opponent = opponentForPuzzle(n);
	const oppTeam = buildTeam(opponent.sets);
	const cands = candidateTeams(date, oppTeam, opponent).slice(0, CANDIDATES);
	let best: { score: number; ids: string[]; archetype: string; ai: number; greedy: number } | null = null;
	for (const c of cands) {
		let ai = 0, greedy = 0;
		for (let g = 0; g < AI_GAMES; g++) if (playGame(c.team, oppTeam, { p1Config: fast, p2Config: fast }).winner === 'Player') ai++;
		for (let g = 0; g < GREEDY_GAMES; g++) if (playGame(c.team, oppTeam, { p1Greedy: true, p2Config: fast }).winner === 'Player') greedy++;
		const score = Math.abs(ai / AI_GAMES - AI_TARGET) + 0.5 * Math.abs(greedy / GREEDY_GAMES - GREEDY_TARGET) + 0.1 * c.diff;
		console.log(`#${n} ${opponent.id} ${c.archetype} ai ${ai}/${AI_GAMES} greedy ${greedy}/${GREEDY_GAMES} diff ${c.diff.toFixed(2)} :: ${c.ids.join(',')}`);
		if (!best || score < best.score) best = { score, ids: c.ids, archetype: c.archetype, ai, greedy };
	}
	out[date] = { ids: best!.ids, archetype: best!.archetype };
	console.log(`=> #${n} ${date}: ai ${best!.ai}/${AI_GAMES} greedy ${best!.greedy}/${GREEDY_GAMES}`);
	fs.writeFileSync(outFile, JSON.stringify(out, null, '\t') + '\n');
}
