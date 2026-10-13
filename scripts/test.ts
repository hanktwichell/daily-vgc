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
	// Replays and archive games say so, and leave the streak out.
	const replay = shareText({ number: 2, won: true, alive: [true, true, true, true], turns: 9 }, 4, true, 'Replay');
	assert.deepEqual(replay.split('\n').slice(0, 3), ['Daily VGC #2 (Hard Mode, Replay)', '🟩🟩🟩🟩 4/4 left · 9 turns', '#DailyVGC']);
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

await test('hard mode unlocks once the daily battle has been played, win or lose', async () => {
	const store = new Map<string, string>();
	(globalThis as any).localStorage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, v),
	};
	const { recordResult, recordArchiveResult, dailyPlayed } = await import('../src/ui/storage');
	const lost = (number: number) => ({ number, won: false, alive: [false, false, false, false], turns: 7 });
	assert.equal(dailyPlayed(4), false);
	recordResult(lost(4));
	assert.equal(dailyPlayed(4), true);
	// A past day first played (and lost) in the archive counts too; its hard mode doesn't.
	recordArchiveResult(lost(2), 'hard');
	assert.equal(dailyPlayed(2), false);
	recordArchiveResult(lost(2), 'normal');
	assert.equal(dailyPlayed(2), true);
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

await test('AI: valid choices when both active Pokémon could Mega Evolve and none can switch in', async () => {
	const { chooseGreedy } = await import('../src/engine/ai');
	const { Battle, Teams, State } = await import('../src/engine/ps');
	const { buildTeam } = await import('../src/data/team-builder');
	// Two-Pokémon teams (custom doubles format), so both slots can Mega Evolve and nobody is on the bench.
	const twoMegas = buildTeam(['garchomp-mega-z', 'raichu-mega-y']);
	const foes = buildTeam(['incineroar', 'rillaboom']);
	for (const pick of [chooseAction, chooseGreedy]) {
		const b = new Battle({ formatid: 'gen9championsdoublescustomgame' as any });
		b.setPlayer('p1', { name: 'You', team: Teams.pack(twoMegas) });
		b.setPlayer('p2', { name: 'CPU', team: Teams.pack(foes) });
		b.choose('p1', 'team 12');
		b.choose('p2', 'team 12');
		const req = b.sides[0].activeRequest as any;
		assert.ok(req.active[0].canMegaEvo && req.active[1].canMegaEvo, 'both leads should be able to Mega Evolve');
		const choice = pick(JSON.stringify(State.serializeBattle(b)), 0);
		assert.ok(choice.split(',').filter(c => c.trim().endsWith(' mega')).length <= 1, `two Megas in ${choice}`);
		assert.ok(b.choose('p1', choice), `rejected: ${choice}`);
	}
});

await test('AI: never Decorates a foe or sets Tailwind under Trick Room', async () => {
	const { Battle, Teams, State } = await import('../src/engine/ps');
	const { buildTeam } = await import('../src/data/team-builder');
	const fast = { ownJoint: 8, oppJoint: 6, refineTop: 2, refineSamples: 1, lambda: 0.85, temperature: 0.1, explore: 0.25, budgetMs: 1000 };
	const setup = (cpu: string[], you: string[], tr: boolean, faintPartner: boolean) => {
		const b = new Battle({ formatid: 'gen9championsdoublescustomgame' as any });
		b.setPlayer('p1', { name: 'You', team: Teams.pack(buildTeam(you)) });
		b.setPlayer('p2', { name: 'CPU', team: Teams.pack(buildTeam(cpu)) });
		b.choose('p1', 'team 12');
		b.choose('p2', 'team 12');
		if (tr) b.field.addPseudoWeather('trickroom', b.sides[0].active[0]);
		if (faintPartner) {
			b.sides[1].active[1].faint();
			b.faintMessages();
			b.makeRequest('move');
		}
		return JSON.stringify(State.serializeBattle(b));
	};
	// Alcremie's move 1 is Decorate; with its partner gone it has no one to use it on.
	const alone = setup(['alcremie', 'tinkaton'], ['incineroar', 'rillaboom'], false, true);
	// Whimsicott's move 1 is Tailwind; the room has 5 turns left.
	const room = setup(['whimsicott', 'alcremie'], ['sneasler', 'garchomp'], true, false);
	for (let i = 0; i < 6; i++) {
		const a = chooseAction(alone, 1, Math.random, fast).split(',')[0].trim();
		assert.ok(!/^move 1 [12]/.test(a), `Decorate on a foe: ${a}`);
		const t = chooseAction(room, 1, Math.random, fast).split(',')[0].trim();
		assert.ok(!t.startsWith('move 1'), `Tailwind under Trick Room: ${t}`);
	}
});

await test('AI: Tailwind doubles speedOf once, and Trick Room leaves it alone', async () => {
	const { speedOf } = await import('../src/engine/ai');
	const { Battle, Teams } = await import('../src/engine/ps');
	const { buildTeam } = await import('../src/data/team-builder');
	const b = new Battle({ formatid: 'gen9championsdoublescustomgame' as any });
	b.setPlayer('p1', { name: 'You', team: Teams.pack(buildTeam(['incineroar', 'rillaboom'])) });
	b.setPlayer('p2', { name: 'CPU', team: Teams.pack(buildTeam(['whimsicott', 'alcremie'])) });
	b.choose('p1', 'team 12');
	b.choose('p2', 'team 12');
	const [mon, foe] = [b.sides[1].active[0], b.sides[0].active[0]];
	const [base, foeBase] = [speedOf(mon), speedOf(foe)];
	assert.ok(b.sides[1].addSideCondition('tailwind', mon));
	assert.equal(speedOf(mon), base * 2);
	assert.equal(speedOf(foe), foeBase, 'Tailwind only speeds up its own side');
	b.field.addPseudoWeather('trickroom', mon);
	assert.equal(speedOf(mon), base * 2, 'callers flip for Trick Room themselves');
});

await test('AI: its last Pokémon only repeats Protect when the stalled turn is worth something', async () => {
	const { repeatProtectReason } = await import('../src/engine/ai');
	const { Battle, Teams, State } = await import('../src/engine/ps');
	const fast = { ownJoint: 8, oppJoint: 6, refineTop: 2, refineSamples: 1, lambda: 0.85, temperature: 0.1, explore: 0.25, budgetMs: 1000 };
	const mon = (species: string, moves: string[], item = '', ability = '') => ({
		name: species, species, item, ability, moves, nature: 'Serious', gender: '', level: 50,
		evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
	});
	// The CPU (p2) is down to its first Pokémon, whose move 1 is Protect. It has either just
	// Protected for real (`turn` is the player's choice that turn) or been given the stall counter.
	const scene = (cpu: any, you: any[], tweak?: (b: any) => void, turn?: string) => {
		const b: any = new Battle({ formatid: 'gen9championsdoublescustomgame' as any });
		b.setPlayer('p1', { name: 'You', team: Teams.pack(you) });
		b.setPlayer('p2', { name: 'CPU', team: Teams.pack([cpu, mon('Magikarp', ['Splash'])]) });
		b.choose('p1', 'team 12');
		b.choose('p2', 'team 12');
		b.sides[1].active[1].faint();
		b.faintMessages();
		b.makeRequest('move');
		if (turn) {
			b.choose('p1', turn);
			b.choose('p2', 'move 1, pass');
		} else {
			b.sides[1].active[0].addVolatile('stall');
		}
		tweak?.(b);
		return JSON.stringify(State.serializeBattle(b));
	};
	const picks = (json: string, n: number) => Array.from({ length: n }, () => chooseAction(json, 1, Math.random, fast).split(',')[0].trim());
	const you = (b: any) => b.sides[0], cpu = (b: any) => b.sides[1].active[0];
	const alone = (b: any) => { you(b).active[1].faint(); b.faintMessages(); b.makeRequest('move'); };
	const chomp = (item = '') => mon('Garchomp', ['Protect', 'Earthquake', 'Dragon Claw', 'Rock Slide'], item, 'Rough Skin');
	const foes = () => [
		mon('Incineroar', ['Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot'], '', 'Intimidate'),
		mon('Rillaboom', ['Wood Hammer', 'Grassy Glide', 'U-turn', 'High Horsepower'], '', 'Overgrow'),
	];
	const rain = () => [mon('Pelipper', ['Weather Ball', 'Hurricane'], '', 'Keen Eye'), mon('Kingdra', ['Muddy Water', 'Draco Meteor'], '', 'Swift Swim')];
	const venusaur = () => [mon('Venusaur', ['Solar Beam', 'Sludge Bomb'], '', 'Overgrow'), mon('Snorlax', ['Splash', 'Body Slam'], '', 'Thick Fat')];
	const swampert = mon('Swampert', ['Protect', 'Waterfall', 'Earthquake', 'Ice Punch'], '', 'Torrent');
	const half = (b: any) => { cpu(b).hp = Math.floor(cpu(b).maxhp / 2); };
	const trickRoom = (turns: number) => (b: any) => { b.field.addPseudoWeather('trickroom', you(b).active[0]); b.field.pseudoWeather.trickroom.duration = turns; };
	const reflect = (turns: number) => (b: any) => { you(b).addSideCondition('reflect', you(b).active[0]); you(b).sideConditions.reflect.duration = turns; };

	// Nothing to gain: never a second Protect.
	const plain = scene(chomp(), foes());
	assert.equal(repeatProtectReason(plain, 1), null);
	for (const c of picks(plain, 8)) assert.ok(c !== 'move 1', 'repeated Protect with nothing to gain');

	const cases: [string, string | null, string][] = [
		['Leftovers with HP to recover', 'passive healing', scene(chomp('Leftovers'), foes(), half)],
		['Leftovers at full HP', null, scene(chomp('Leftovers'), foes())],
		['a poisoned foe', 'passive damage', scene(chomp(), foes(), b => { you(b).active[0].setStatus('psn'); })],
		['both sides burned alike', null, scene(chomp(), foes(), b => { you(b).active[0].setStatus('brn'); cpu(b).setStatus('brn'); })],
		['the last turn of their Trick Room', 'stalling out trickroom', scene(chomp(), foes(), trickRoom(1))],
		['Trick Room with four turns left', null, scene(chomp(), foes(), trickRoom(4))],
		['a Trick Room that suits us', null, scene(mon('Snorlax', ['Protect', 'Body Slam', 'Crunch', 'Earthquake'], '', 'Thick Fat'), foes(), trickRoom(1))],
		['their Reflect about to end', 'stalling out reflect', scene(chomp(), foes(), reflect(2))],
		['their Reflect with four turns left', null, scene(chomp(), foes(), reflect(4))],
		['the last turn of their rain', 'stalling out raindance', scene(chomp(), rain(), b => { b.field.setWeather('raindance', you(b).active[0]); b.field.weatherState.duration = 1; })],
		['a last foe with one attack left', 'PP stall', scene(chomp(), foes(), b => { alone(b); you(b).active[0].moveSlots.forEach((m: any, i: number) => { m.pp = i ? 0 : 1; }); })],
		['a last foe with plenty of PP', null, scene(chomp(), foes(), alone)],
		['a charged Solar Beam that would knock us out', 'blocking Solar Beam', scene(swampert, venusaur(), undefined, 'move 1 1, move 1')],
		['a charged Solar Beam we can take', null, scene(mon('Venusaur', ['Protect', 'Sludge Bomb', 'Giga Drain', 'Earth Power'], '', 'Overgrow'), venusaur(), undefined, 'move 1 1, move 1')],
		['a charged Solar Beam from a last foe we knock out first', null,
			scene(mon('Talonflame', ['Protect', 'Brave Bird', 'Flare Blitz', 'U-turn'], '', 'Flame Body'), venusaur(), b => { alone(b); cpu(b).hp = 20; you(b).active[0].hp = 40; }, 'move 1 1, move 1')],
	];
	for (const [name, reason, json] of cases) assert.equal(repeatProtectReason(json, 1), reason, name);

	// A reason isn't enough if the stalled turn changes nothing: Leftovers can't save a Garchomp both foes knock out.
	for (const c of picks(cases[0][2], 6)) assert.ok(c !== 'move 1', 'repeated Protect for Leftovers when knocked out next turn anyway');
	// Blocking the Solar Beam is the only way to stay in the game.
	assert.ok(picks(cases[12][2], 6).includes('move 1'), 'never tried to block the charged Solar Beam');
});

await test('community stats: submissions are validated and summarised', async () => {
	const { validateSubmission, aggregate } = await import('../src/shared/community');
	const team = ['Musharna', 'Dragalge', 'Indeedee-F', 'Perrserker', 'Araquanid', 'Bastiodon'];
	const ok = { cid: 'abcdef12-3456', puzzle: 3, mode: 'normal', won: true, alive: 3, turns: 12, picks: [1, 0, 4, 5], team };
	assert.equal(typeof validateSubmission(ok), 'object');
	assert.equal(validateSubmission({ ...ok, won: false }), 'alive does not match the result');
	assert.equal(validateSubmission({ ...ok, picks: [0, 0, 1, 2] }), 'bad picks');
	assert.equal(validateSubmission({ ...ok, picks: [0, 1, 2, 6] }), 'bad picks');
	assert.equal(validateSubmission({ ...ok, team: team.slice(0, 5) }), 'bad team');
	assert.equal(validateSubmission({ ...ok, mode: 'archive' }), 'bad mode');

	const row = (won: boolean, alive: number, picks: number[], t = team) => ({ won: won ? 1 : 0, alive, picks: picks.join(','), team: JSON.stringify(t) });
	const rows = [
		row(true, 4, [1, 0, 4, 5]), row(true, 2, [0, 1, 5, 4]), row(true, 1, [4, 5, 0, 1]), row(false, 0, [0, 1, 4, 5]),
		row(false, 0, [0, 1, 2, 3]), row(false, 0, [3, 2, 1, 0]), row(false, 0, [0, 1, 2, 3]), row(true, 3, [0, 1, 2, 3]),
		row(true, 4, [0, 1, 2, 3], ['A', 'B', 'C', 'D', 'E', 'F']), // wrong team: ignored
	];
	const m = aggregate(rows)!;
	assert.equal(m.played, 8);
	assert.equal(m.won, 4);
	assert.deepEqual(m.results, [1, 1, 1, 1, 4]);
	assert.deepEqual(m.picks, [8, 8, 4, 4, 4, 4]);
	// Order doesn't matter: [1,0,4,5], [0,1,5,4], [4,5,0,1] and [0,1,4,5] are the same four (3 of 4 won).
	assert.deepEqual(m.best, { picks: [0, 1, 4, 5], played: 4, won: 3 });
	assert.equal(aggregate([]), null);
});

await test('player count: players are named after the class of the day\'s themed trainer', async () => {
	const { OPPONENT_TEAMS, opponentForPuzzle } = await import('../src/data/opponents');
	for (const t of OPPONENT_TEAMS) {
		const [one, many] = t.players;
		assert.ok(t.trainer.startsWith(`${one} `), `${t.trainer} is not a ${one}`);
		assert.ok(many && many !== one, `bad plural for ${one}: ${many}`);
	}
	assert.equal(generateDaily(dateForPuzzleNumber(0)).opponent.trainer, 'Pâtissière Coco');
	assert.deepEqual(opponentForPuzzle(0).players, ['Pâtissière', 'Pâtissières']);
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
