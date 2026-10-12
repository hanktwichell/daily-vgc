// Fast checks for Daily VGC. Run with `npm test`.
import '../src/engine/ps-node';
import assert from 'node:assert/strict';
import { TeamValidator, FORMAT_ID } from '../src/engine/ps-node';
import { puzzleDateFor, puzzleNumberFor, dateForPuzzleNumber, msUntilNextPuzzle, LAUNCH_DATE } from '../src/data/calendar';
import { generateDaily } from '../src/data/daily';
import { getLibrarySet } from '../src/data/library';
import { BattleRunner } from '../src/engine/runner';
import { chooseAction } from '../src/engine/ai';
import { playGame } from './simulate';

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
	const t = Date.now();
	try {
		await fn();
		passed++;
		console.log(`✓ ${name} (${Date.now() - t}ms)`);
	} catch (e) {
		console.error(`✗ ${name}`);
		throw e;
	}
}

await test('calendar: puzzle day rolls over at midnight New York time', () => {
	assert.equal(puzzleNumberFor(LAUNCH_DATE), 0);
	assert.equal(puzzleNumberFor('2026-10-13'), 1);
	assert.equal(dateForPuzzleNumber(0), LAUNCH_DATE);
	assert.equal(dateForPuzzleNumber(31), '2026-11-12');
	// 23:59 EDT on Oct 12 is still puzzle #0; 00:00 EDT Oct 13 (04:00 UTC) is #1.
	assert.equal(puzzleDateFor(new Date('2026-10-13T03:59:00Z')), '2026-10-12');
	assert.equal(puzzleDateFor(new Date('2026-10-13T04:00:00Z')), '2026-10-13');
	// Winter (EST, UTC-5).
	assert.equal(puzzleDateFor(new Date('2027-01-15T04:59:00Z')), '2027-01-14');
	assert.equal(puzzleDateFor(new Date('2027-01-15T05:00:00Z')), '2027-01-15');
	const ms = msUntilNextPuzzle(new Date('2026-10-13T03:00:00Z'));
	assert.ok(Math.abs(ms - 3600_000) < 2000, `expected ~1h, got ${ms}`);
});

const validator = TeamValidator.get(FORMAT_ID);
await test('daily puzzles: deterministic, legal under Reg M-C, opponent always has one Mega', () => {
	for (let n = 0; n <= 20; n++) {
		const date = dateForPuzzleNumber(n);
		const a = generateDaily(date), b = generateDaily(date);
		assert.deepEqual(a.playerIds, b.playerIds, `puzzle ${n} not deterministic`);
		assert.equal(a.number, n);
		for (const team of [a.playerTeam, a.opponentTeam]) {
			const problems = validator.validateTeam(JSON.parse(JSON.stringify(team)));
			assert.ok(!problems?.length, `puzzle ${n}: ${problems?.join('; ')}`);
		}
		assert.equal(a.opponent.sets.filter(id => getLibrarySet(id).isMega).length, 1);
		const megas = a.playerIds.filter(id => getLibrarySet(id).isMega).length;
		assert.ok(megas <= 2, `puzzle ${n} has ${megas} player Megas`);
		const oppSpecies = new Set(a.opponentTeam.map(s => s.species));
		assert.ok(a.playerTeam.every(s => !oppSpecies.has(s.species)), `puzzle ${n} mirror species`);
	}
});

await test('hard mode: same meta team for everyone, legal, themed team vs a Mega-bearing meta team', async () => {
	const { generateHard } = await import('../src/data/daily');
	const { META_TEAMS } = await import('../src/data/meta-teams');
	for (let n = 0; n <= 10; n++) {
		const date = dateForPuzzleNumber(n);
		const a = generateHard(date), b = generateHard(date);
		assert.equal(a.opponent.id, b.opponent.id, `hard ${n} not deterministic`);
		assert.ok(META_TEAMS.some(m => m.id === a.opponent.id));
		assert.deepEqual(a.playerTeam.map(s => s.species), generateDaily(date).opponentTeam.map(s => s.species), 'player gets the themed team');
		for (const team of [a.playerTeam, a.opponentTeam]) {
			const problems = validator.validateTeam(JSON.parse(JSON.stringify(team)));
			assert.ok(!problems?.length, `hard ${n}: ${problems?.join('; ')}`);
		}
	}
});

await test('share text format', async () => {
	const { shareText } = await import('../src/ui/share');
	const text = shareText({ number: 1, won: true, alive: [true, true, false, true], turns: 16 }, 1);
	assert.equal(text, 'Daily VGC #1\n🟩🟩🟥🟩 3/4 left · 16 turns\nStreak: 1 · #DailyVGC\ndailyvgc.online');
	const hard = shareText({ number: 2, won: false, alive: [false, false, false, false], turns: 9 }, 0, true);
	assert.equal(hard.split('\n')[0], 'Daily VGC #2 (Hard Mode)');
});

await test('stats: streaks work starting from puzzle #0', async () => {
	const store = new Map<string, string>();
	(globalThis as any).localStorage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
	};
	const { recordResult, currentStreak, loadStats } = await import('../src/ui/storage');
	const alive = [true, true, true, true];
	recordResult({ number: 0, won: true, alive, turns: 8 });
	assert.equal(currentStreak(loadStats(), 0), 1);
	assert.equal(currentStreak(loadStats(), 1), 1, 'streak should carry into the next day');
	recordResult({ number: 1, won: true, alive, turns: 9 });
	assert.equal(currentStreak(loadStats(), 1), 2);
	assert.equal(currentStreak(loadStats(), 3), 0, 'missing a day resets the streak');
	recordResult({ number: 2, won: false, alive: [false, false, false, false], turns: 7 });
	const stats = loadStats();
	assert.equal(currentStreak(stats, 2), 0);
	assert.deepEqual([stats.played, stats.won, stats.maxStreak], [3, 2, 2]);
	delete (globalThis as any).localStorage;
});

await test('stats: results graph buckets', async () => {
	const { bucketFor, resultDistribution } = await import('../src/ui/StatsSummary');
	const rec = (number: number, won: boolean, left: number) => ({ number, won, alive: [0, 1, 2, 3].map(i => i < left), turns: 10 });
	assert.equal(bucketFor(rec(0, true, 4)), 'Perfect');
	assert.equal(bucketFor(rec(0, true, 3)), '3/4');
	assert.equal(bucketFor(rec(0, true, 1)), '1/4');
	assert.equal(bucketFor(rec(0, false, 0)), 'Loss');
	const history = { 0: rec(0, true, 4), 1: rec(1, true, 2), 2: rec(2, false, 0), 3: rec(3, true, 2) };
	assert.deepEqual(resultDistribution({ played: 4, won: 3, streak: 1, maxStreak: 2, lastNumber: 3, history }),
		{ Perfect: 1, '3/4': 0, '2/4': 2, '1/4': 0, Loss: 1 });
});

await test('battle runner: save/restore mid-battle keeps the pending request', () => {
	const d = generateDaily(dateForPuzzleNumber(3));
	const r = new BattleRunner({ name: 'You', team: d.playerTeam }, { name: 'CPU', team: d.opponentTeam });
	r.choose(1, 'team 1234');
	r.choose(0, 'team 2143');
	const restored = BattleRunner.restore(r.serialize());
	assert.ok(restored.needsChoice(0));
	assert.ok(restored.request(0).active);
	const ai = chooseAction(restored.serialize(), 1);
	assert.ok(restored.choose(1, ai), `AI choice rejected: ${ai}`);
	assert.ok(restored.battle.inputLog.some(l => l.startsWith('>p1 team')));
});

await test('AI vs AI: a full battle finishes without invalid choices', () => {
	const d = generateDaily(dateForPuzzleNumber(5));
	const result = playGame(d.playerTeam, d.opponentTeam, {
		p1Config: { ownJoint: 6, oppJoint: 4, refineTop: 0, refineSamples: 0, lambda: 0.85, temperature: 0.05, explore: 0, budgetMs: 1000 },
	});
	assert.ok(result.winner === 'Player' || result.winner === 'CPU', `unexpected winner ${result.winner}`);
	assert.ok(result.turns > 0);
});

console.log(`\n${passed} tests passed`);
