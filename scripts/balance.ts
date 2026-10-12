// Balance check: AI vs AI on a range of daily puzzles.
// Usage: tsx scripts/balance.ts <fromPuzzle> <toPuzzle> [gamesPerPuzzle] [--full]
import '../src/engine/ps-node';
import { generateDaily, dateForPuzzleNumber } from '../src/data/daily';
import { DEFAULT_AI, type AIConfig } from '../src/engine/ai';
import { playGame } from './simulate';

const from = Number(process.argv[2] || 1), to = Number(process.argv[3] || 10), games = Number(process.argv[4] || 2);
const fast: AIConfig = { ...DEFAULT_AI, ownJoint: 8, oppJoint: 6, refineTop: 0 };
const cfg = process.argv.includes('--full') ? DEFAULT_AI : fast;
let total = 0, wins = 0;
for (let n = from; n <= to; n++) {
	const d = generateDaily(dateForPuzzleNumber(n));
	const megas = d.playerTeam.filter(s => /ite( [XYZ])?$/.test(s.item)).length;
	let w = 0; const res: string[] = [];
	for (let g = 0; g < games; g++) {
		try {
			const r = playGame(d.playerTeam, d.opponentTeam, { p1Config: cfg, p2Config: cfg });
			if (r.winner === 'Player') w++;
			res.push(`${r.winner === 'Player' ? 'W' : 'L'}${r.p1Left}-${r.p2Left}/${r.turns}t`);
		} catch (e: any) { res.push(`ERR ${e.message}`); }
	}
	total += games; wins += w;
	console.log(`#${n}\t${d.archetype}\tmegas=${megas}\t${d.opponent.id}\t${w}/${games}\t${res.join(' ')}`);
}
console.log(`TOTAL player wins ${wins}/${total} (${(100 * wins / total).toFixed(0)}%)`);
