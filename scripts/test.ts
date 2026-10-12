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
	assert.equal(puzzleNumberFor(LAUNCH_DATE), 1);
	assert.equal(dateForPuzzleNumber(1), LAUNCH_DATE);
	assert.equal(dateForPuzzleNumber(32), '2026-11-12');
	// 23:59 EDT on Oct 12 is still puzzle #1; 00:00 EDT Oct 13 (04:00 UTC) is #2.
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
	for (let n = 1; n <= 20; n++) {
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

await test('share text format', async () => {
	const { shareText } = await import('../src/ui/share');
	(globalThis as any).location = { host: 'daily-vgc.com', pathname: '/' };
	const text = shareText({ number: 1, won: true, alive: [true, true, false, true], turns: 16 }, 1);
	assert.equal(text, 'Daily VGC #1\n🟩🟩🟥🟩 3/4 left · 16 turns\nStreak: 1 · #DailyVGC\ndaily-vgc.com');
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
