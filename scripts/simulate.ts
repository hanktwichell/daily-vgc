// Plays AI vs AI games for a daily puzzle. Usage: tsx scripts/simulate.ts [puzzleNumber] [games] [--log]
import '../src/engine/ps-node';
import { generateDaily, dateForPuzzleNumber } from '../src/data/daily';
import { BattleRunner } from '../src/engine/runner';
import { chooseAction, chooseGreedy, DEFAULT_AI, type AIConfig } from '../src/engine/ai';

export function playGame(p1Team: any[], p2Team: any[], opts: { log?: boolean, p1Config?: AIConfig, p2Config?: AIConfig, p1Greedy?: boolean } = {}) {
	const runner = new BattleRunner({ name: 'Player', team: p1Team }, { name: 'CPU', team: p2Team });
	let decisions = 0, thinkMs = 0;
	for (let guard = 0; guard < 400 && !runner.ended; guard++) {
		const json = runner.serialize();
		const choices: [0 | 1, string][] = [];
		for (const side of [0, 1] as const) {
			if (!runner.needsChoice(side)) continue;
			const t = Date.now();
			const choice = side === 0 && opts.p1Greedy ? chooseGreedy(json, side) :
				chooseAction(json, side, Math.random, side === 0 ? opts.p1Config : opts.p2Config);
			thinkMs += Date.now() - t; decisions++;
			choices.push([side, choice]);
		}
		if (!choices.length) throw new Error('No side needs a choice but battle not ended');
		for (const [side, choice] of choices) {
			if (!runner.choose(side, choice)) {
				console.log('INVALID', side, choice, JSON.stringify(runner.request(side)).slice(0, 300));
				runner.choose(side, 'default');
			}
		}
		const lines = runner.readLog('omniscient');
		if (opts.log) for (const l of lines) if (/^\|(move|switch|faint|-damage|-heal|turn|win|-mega|cant|-status|-weather|-fieldstart|-sidestart)\|/.test(l)) console.log(l);
	}
	const alive = (i: number) => runner.battle.sides[i].pokemon.filter(p => !p.fainted).length;
	return { winner: runner.winner, turns: runner.turn, p1Left: alive(0), p2Left: alive(1), decisions, thinkMs };
}

if (process.argv[1]?.endsWith('simulate.ts')) {
	const n = Number(process.argv[2] || 1);
	const games = Number(process.argv[3] || 1);
	const log = process.argv.includes('--log');
	const daily = generateDaily(dateForPuzzleNumber(n));
	console.log(`#${n} ${daily.opponent.name}: player ${daily.playerTeam.map(s => s.species).join(', ')}`);
	let wins = 0;
	for (let g = 0; g < games; g++) {
		const r = playGame(daily.playerTeam, daily.opponentTeam, { log });
		if (r.winner === 'Player') wins++;
		console.log(`game ${g + 1}: ${r.winner} in ${r.turns} turns, left ${r.p1Left}-${r.p2Left}, avg think ${(r.thinkMs / r.decisions).toFixed(0)}ms`);
	}
	console.log(`player won ${wins}/${games}`);
}
