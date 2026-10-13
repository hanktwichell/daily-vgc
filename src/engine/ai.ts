// Daily VGC opponent AI.
//
// Decisions are made by one-ply simultaneous-move search on cloned battles:
//   1. Enumerate legal options for each of our active Pokémon and for the opponent's,
//      and prune them with a fast heuristic built on the simulator's own damage formula.
//   2. Play every (our joint action × their joint action) pair forward one turn on a copy
//      of the battle with a fresh random seed, and score the result with a static evaluation.
//   3. Choose a robust action (a blend of expected value against a "smart opponent" model and
//      worst case), then sample among the best with a soft-max so play is never deterministic.
//
// The AI sees what Open Team Sheets shows (species, moves, items, abilities) and the current
// battle state, never the player's pending choice or the battle's RNG seed.
import { Battle, State } from './ps';
import type { Pokemon } from '../../vendor/ps/sim/pokemon';
import type { Side } from '../../vendor/ps/sim/side';

type RNG = () => number;

export interface AIConfig {
	/** Joint actions of our own to consider per decision. */
	ownJoint: number;
	/** Joint actions of the opponent to model. */
	oppJoint: number;
	/** Extra rollouts for the most promising candidates. */
	refineTop: number;
	refineSamples: number;
	/** Weight of expected value vs. worst case. */
	lambda: number;
	/** Soft-max temperature over final scores (lower = sharper). */
	temperature: number;
	/** Probability of picking from a slightly wider band (keeps games varied). */
	explore: number;
	/** Skip refinement once this much time (ms) has been spent, so slow phones stay responsive. */
	budgetMs: number;
}

export const DEFAULT_AI: AIConfig = {
	ownJoint: 16, oppJoint: 10, refineTop: 5, refineSamples: 2, lambda: 0.85, temperature: 0.03, explore: 0.05, budgetMs: 3000,
};

/** A looser opponent: fewer options considered and more random among the good ones. */
export const RELAXED_AI: AIConfig = {
	ownJoint: 10, oppJoint: 6, refineTop: 2, refineSamples: 1, lambda: 0.85, temperature: 0.1, explore: 0.25, budgetMs: 2000,
};

/* ------------------------------------------------------------------------------------------ */
/* Option enumeration                                                                           */
/* ------------------------------------------------------------------------------------------ */

interface SlotOption {
	choice: string;
	kind: 'move' | 'switch' | 'pass';
	moveId?: string;
	/** Target location as used by the sim (1/2 foe slots, -1/-2 own slots). */
	target?: number;
	switchTo?: number;
	score: number;
}

interface JointOption {
	choice: string;
	slots: SlotOption[];
	score: number;
}

const NEEDS_TARGET = new Set(['normal', 'any', 'adjacentFoe', 'adjacentAlly', 'adjacentAllyOrSelf']);
/** Single-target moves that only make sense on a partner (they boost, heal or help the target). */
const ALLY_ONLY = new Set(['decorate', 'healpulse', 'floralhealing', 'instruct']);
/** Moves worth considering on either a foe or the partner. */
const ALLY_OR_FOE = new Set(['pollenpuff']);

function aliveFoeSlots(side: Side): number[] {
	const foe = side.foe;
	const out: number[] = [];
	foe.active.forEach((p, i) => { if (p && !p.fainted) out.push(i + 1); });
	return out;
}

function enumerateSlot(battle: Battle, side: Side, slot: number, request: any, forced: boolean): SlotOption[] {
	const options: SlotOption[] = [];
	const pokemon = side.active[slot];
	const switchTargets: number[] = [];
	request.side.pokemon.forEach((p: any, i: number) => {
		if (p.active || p.condition.endsWith(' fnt')) return;
		switchTargets.push(i + 1);
	});

	if (forced) {
		if (!request.forceSwitch[slot]) return [{ choice: 'pass', kind: 'pass', score: 0 }];
		if (!switchTargets.length) return [{ choice: 'pass', kind: 'pass', score: 0 }];
		return switchTargets.map(t => ({ choice: `switch ${t}`, kind: 'switch', switchTo: t, score: 0 }));
	}

	const active = request.active?.[slot];
	if (!active || !pokemon || pokemon.fainted) return [{ choice: 'pass', kind: 'pass', score: 0 }];
	const mega = active.canMegaEvo ? ' mega' : '';
	const foes = aliveFoeSlots(side);
	const ally = side.active[slot ^ 1];

	active.moves.forEach((m: any, i: number) => {
		if (m.disabled) return;
		if (m.pp === 0 && m.maxpp) return;
		const target = m.target as string;
		if (NEEDS_TARGET.has(target) && active.moves.length > 0) {
			if (target === 'adjacentAlly') {
				if (ally && !ally.fainted) options.push({ choice: `move ${i + 1} -${(slot ^ 1) + 1}${mega}`, kind: 'move', moveId: m.id, target: -((slot ^ 1) + 1), score: 0 });
				return;
			}
			if (target === 'adjacentAllyOrSelf') {
				options.push({ choice: `move ${i + 1} -${slot + 1}${mega}`, kind: 'move', moveId: m.id, target: -(slot + 1), score: 0 });
				return;
			}
			const allyTarget = ALLY_ONLY.has(m.id) || ALLY_OR_FOE.has(m.id);
			if (allyTarget && ally && !ally.fainted) {
				options.push({ choice: `move ${i + 1} -${(slot ^ 1) + 1}${mega}`, kind: 'move', moveId: m.id, target: -((slot ^ 1) + 1), score: 0 });
			}
			if (ALLY_ONLY.has(m.id)) return;
			for (const t of foes) {
				options.push({ choice: `move ${i + 1} ${t}${mega}`, kind: 'move', moveId: m.id, target: t, score: 0 });
			}
			if (!foes.length) options.push({ choice: `move ${i + 1}${mega}`, kind: 'move', moveId: m.id, score: 0 });
		} else {
			options.push({ choice: `move ${i + 1}${mega}`, kind: 'move', moveId: m.id, score: 0 });
		}
	});
	if (!active.trapped) {
		for (const t of switchTargets) options.push({ choice: `switch ${t}`, kind: 'switch', switchTo: t, score: 0 });
	}
	if (!options.length) options.push({ choice: 'move 1', kind: 'move', moveId: 'struggle', score: 0 });
	return options;
}

/* ------------------------------------------------------------------------------------------ */
/* Damage estimates (uses the simulator's damage formula on a scratch copy)                     */
/* ------------------------------------------------------------------------------------------ */

const ABSORB: { [ability: string]: string[] } = {
	waterabsorb: ['Water'], stormdrain: ['Water'], dryskin: ['Water'], voltabsorb: ['Electric'],
	lightningrod: ['Electric'], motordrive: ['Electric'], flashfire: ['Fire'], wellbakedbody: ['Fire'],
	sapsipper: ['Grass'], eartheater: ['Ground'], levitate: ['Ground'], eelevate: ['Ground'],
};

export class Analyzer {
	battle: Battle;
	private cache = new Map<string, number>();
	constructor(source: string | Battle) {
		this.battle = typeof source === 'string' ? State.deserializeBattle(source) : source;
		const b = this.battle as any;
		b.randomizer = (d: number) => Math.trunc(d * 92.5 / 100);
		b.add = () => {};
		b.addMove = () => {};
		b.hint = () => {};
		b.debug = () => {};
		b.attrLastMove = () => {};
	}

	/** Expected damage as a fraction of the target's max HP (accuracy-weighted, no crits). */
	damageFrac(source: Pokemon, target: Pokemon, moveId: string, spread = false): number {
		const key = `${source.fullname}|${source.species.id}|${target.fullname}|${target.species.id}|${moveId}|${spread}`;
		const cached = this.cache.get(key);
		if (cached !== undefined) return cached;
		let value = 0;
		try {
			value = this.computeDamageFrac(source, target, moveId, spread);
		} catch {
			value = 0;
		}
		this.cache.set(key, value);
		return value;
	}

	private computeDamageFrac(source: Pokemon, target: Pokemon, moveId: string, spread: boolean) {
		const battle = this.battle;
		const dexMove = battle.dex.moves.get(moveId);
		if (dexMove.category === 'Status') return 0;
		const move = battle.dex.getActiveMove(moveId);
		battle.singleEvent('ModifyType', move, null, source, target, move, move);
		battle.runEvent('ModifyType', source, target, move, move);
		move.willCrit = false;
		const tAbility = target.getAbility().id;
		if (ABSORB[tAbility]?.includes(move.type) && !source.hasAbility(['moldbreaker', 'teravolt', 'turboblaze'])) return 0;
		if (tAbility === 'bulletproof' && move.flags['bullet']) return 0;
		if (tAbility === 'soundproof' && move.flags['sound']) return 0;
		if (target.hasType('Flying') && move.type === 'Ground' && !battle.field.getPseudoWeather('gravity')) return 0;
		const dmg = battle.actions.getDamage(source, target, move, true);
		if (!dmg || typeof dmg !== 'number') return 0;
		let total = dmg;
		if (move.multihit) {
			const hits = Array.isArray(move.multihit) ?
				(source.hasAbility('skilllink') ? move.multihit[1] : (source.hasItem('loadeddice') ? 4 : 3.1)) :
				move.multihit;
			total *= hits;
		}
		if (spread) total *= 0.75;
		const acc = move.accuracy === true ? 1 : Math.min(1, (move.accuracy as number) / 100 *
			(source.hasAbility('noguard') || target.hasAbility('noguard') ? 100 / (move.accuracy as number) : 1));
		if (moveId === 'fakeout' && source.activeMoveActions > 0) return 0;
		if (move.id === 'focuspunch') return 0;
		return Math.min(4, (total * acc) / target.maxhp);
	}

	bestDamage(source: Pokemon, target: Pokemon): number {
		let best = 0;
		for (const ms of source.moveSlots) {
			best = Math.max(best, this.damageFrac(source, target, ms.id));
		}
		return best;
	}
}

/* ------------------------------------------------------------------------------------------ */
/* Heuristic scoring for pruning                                                                */
/* ------------------------------------------------------------------------------------------ */

const PROTECT_MOVES = new Set(['protect', 'detect', 'kingsshield', 'spikyshield', 'banefulbunker', 'silktrap', 'burningbulwark', 'obstruct', 'maxguard']);
const SETUP_MOVES = new Set(['swordsdance', 'dragondance', 'nastyplot', 'quiverdance', 'calmmind', 'bulkup', 'shellsmash', 'bellydrum', 'irondefense', 'noretreat', 'coil', 'shiftgear', 'victorydance', 'tidyup']);
const REDIRECT = new Set(['followme', 'ragepowder']);

function speedOf(p: Pokemon) {
	return p.getStat('spe', false, false) * (p.side.sideConditions['tailwind'] ? 2 : 1);
}

function slowerTeam(side: Side) {
	const mine = side.active.filter(p => p && !p.fainted).map(speedOf);
	const theirs = side.foe.active.filter(p => p && !p.fainted).map(speedOf);
	if (!mine.length || !theirs.length) return 0;
	const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
	return Math.max(-1, Math.min(1, (avg(theirs) - avg(mine)) / 60));
}

/** Highest damage fraction any active foe can deal to this Pokémon. */
function incomingThreat(an: Analyzer, p: Pokemon) {
	let threat = 0;
	for (const foe of p.side.foe.active) {
		if (!foe || foe.fainted) continue;
		threat = Math.max(threat, an.bestDamage(foe, p) / Math.max(0.01, p.hp / p.maxhp));
	}
	return threat;
}

function scoreSlot(an: Analyzer, side: Side, slot: number, opt: SlotOption): number {
	const battle = an.battle;
	const self = battle.sides[side.n].active[slot];
	if (opt.kind === 'pass') return 0;
	if (opt.kind === 'switch') {
		const incoming = battle.sides[side.n].pokemon[opt.switchTo! - 1];
		if (!self || self.fainted || !incoming) return 0.05;
		const cur = incomingThreat(an, self);
		const next = incomingThreat(an, incoming) * 0.5;
		let offense = 0;
		for (const foe of side.foe.active) if (foe && !foe.fainted) offense = Math.max(offense, an.bestDamage(incoming, foe));
		return 0.02 + Math.max(0, cur - next) * 0.35 + offense * 0.15 - (self.hp / self.maxhp < 0.25 ? 0.1 : 0);
	}
	const move = battle.dex.moves.get(opt.moveId!);
	const foeSide = side.foe;
	const ally = side.active[slot ^ 1];
	const hpFrac = self.hp / self.maxhp;

	if (move.category !== 'Status') {
		if (opt.target && opt.target < 0) {
			// Pollen Puff on the partner heals it for half its HP.
			if (!ally || ally.fainted) return -1;
			const missing = 1 - ally.hp / ally.maxhp;
			return missing > 0.4 ? 0.1 + missing * 0.5 : -0.5;
		}
		let score = 0;
		const spreadFoes = move.target === 'allAdjacentFoes' || move.target === 'allAdjacent';
		const targets: Pokemon[] = [];
		if (spreadFoes) {
			for (const p of foeSide.active) if (p && !p.fainted) targets.push(p);
		} else if (opt.target && opt.target > 0) {
			const t = foeSide.active[opt.target - 1];
			if (t && !t.fainted) targets.push(t);
		}
		const spread = spreadFoes && targets.length + (move.target === 'allAdjacent' && ally && !ally.fainted ? 1 : 0) > 1;
		for (const t of targets) {
			const frac = an.damageFrac(self, t, move.id, spread);
			const remaining = t.hp / t.maxhp;
			score += Math.min(frac, remaining);
			if (frac >= remaining * 0.95) score += 0.45;
		}
		if (move.target === 'allAdjacent' && ally && !ally.fainted) {
			const frac = an.damageFrac(self, ally, move.id, spread);
			score -= Math.min(frac, ally.hp / ally.maxhp) * 1.3 + (frac >= ally.hp / ally.maxhp ? 0.6 : 0);
		}
		if (move.id === 'fakeout') score += self.activeMoveActions === 0 ? 0.45 : -1;
		if (move.priority > 0) score *= 1.1;
		if (move.selfdestruct) score -= 0.6;
		if (move.flags['charge'] && !battle.field.isWeather(['sunnyday', 'desolateland']) && move.id !== 'electroshot') score *= 0.55;
		if (move.self?.boosts && Object.values(move.self.boosts).some(v => (v as number) < 0)) score *= 0.92;
		return score;
	}

	// Status moves
	const threat = incomingThreat(an, self);
	// Never raise a foe's stats or heal it (Swagger and Flatter confuse, which is the point).
	if (opt.target && opt.target > 0 && !['swagger', 'flatter'].includes(move.id)) {
		if (move.heal || (move.boosts && Object.values(move.boosts).some(v => (v as number) > 0))) return -2;
	}
	if (PROTECT_MOVES.has(move.id)) {
		const lastProtect = self.volatiles['stall'] ? 0.35 : 1;
		return lastProtect * (0.08 + Math.min(0.5, threat * 0.35));
	}
	if (move.id === 'tailwind') {
		if (side.sideConditions['tailwind']) return -1;
		// Under Trick Room, Tailwind makes your side move later. Only set it as the room runs out.
		const tr = battle.field.getPseudoWeather('trickroom');
		if (tr && (tr.duration ?? 0) > 1) return -0.8;
		return 0.55;
	}
	if (move.id === 'trickroom') {
		const tr = battle.field.getPseudoWeather('trickroom');
		const slow = slowerTeam(side);
		return tr ? (slow < 0 ? 0.3 : -1) : (slow > 0 ? 0.35 + slow * 0.5 : -0.5);
	}
	if (REDIRECT.has(move.id)) return ally && !ally.fainted ? 0.15 + Math.min(0.35, incomingThreat(an, ally) * 0.25) : -1;
	if (move.id === 'helpinghand') {
		if (!ally || ally.fainted) return -1;
		let best = 0;
		for (const foe of foeSide.active) if (foe && !foe.fainted) best = Math.max(best, an.bestDamage(ally, foe));
		return 0.05 + best * 0.4;
	}
	if (SETUP_MOVES.has(move.id)) {
		const boosts = Object.values(self.boosts).reduce((a, b) => a + Math.max(0, b), 0);
		return hpFrac > 0.6 && boosts < 3 ? 0.32 - threat * 0.15 : 0.02;
	}
	if (['reflect', 'lightscreen', 'auroraveil'].includes(move.id)) {
		const id = move.id;
		if (side.sideConditions[id]) return -1;
		if (id === 'auroraveil' && !battle.field.isWeather(['hail', 'snowscape', 'snow'])) return -1;
		return id === 'auroraveil' ? 0.55 : 0.32;
	}
	const target = opt.target && opt.target > 0 ? foeSide.active[opt.target - 1] : null;
	if (target && !target.fainted) {
		if (['willowisp'].includes(move.id)) {
			if (target.status || target.hasType('Fire')) return -0.5;
			const physical = target.moveSlots.filter(m => battle.dex.moves.get(m.id).category === 'Physical').length;
			return physical >= 2 ? 0.4 : 0.1;
		}
		if (['thunderwave', 'glare', 'nuzzle', 'stunspore'].includes(move.id)) {
			if (target.status || (move.id === 'thunderwave' && target.hasType(['Electric', 'Ground']))) return -0.5;
			return speedOf(target) > speedOf(self) ? 0.3 : 0.12;
		}
		if (['spore', 'sleeppowder', 'yawn', 'hypnosis'].includes(move.id)) {
			if (target.status || target.hasType('Grass') && move.flags['powder']) return -0.5;
			return 0.45;
		}
		if (move.id === 'encore') return target.lastMove && target.lastMove.category === 'Status' ? 0.35 : 0.05;
		if (move.id === 'taunt') return 0.12;
		if (move.id === 'partingshot') return 0.18 + threat * 0.15;
		if (move.id === 'octolock' || move.id === 'saltcure') return 0.25;
	}
	if (['recover', 'roost', 'slackoff', 'synthesis', 'strengthsap', 'moonlight', 'morningsun', 'shoreup'].includes(move.id)) {
		return hpFrac < 0.55 ? 0.4 : 0.02;
	}
	const partner = opt.target && opt.target < 0 && opt.target !== -(slot + 1) ? ally : null;
	if (move.id === 'healpulse' || move.id === 'floralhealing') {
		if (!partner || partner.fainted) return -1;
		const missing = 1 - partner.hp / partner.maxhp;
		return missing > 0.4 ? 0.1 + missing * 0.5 : -0.4;
	}
	if (move.id === 'decorate' || move.id === 'instruct') {
		if (!partner || partner.fainted) return -1;
		let best = 0;
		for (const foe of foeSide.active) if (foe && !foe.fainted) best = Math.max(best, an.bestDamage(partner, foe));
		return 0.08 + best * 0.35;
	}
	if (['coaching', 'lifedew'].includes(move.id)) return ally && !ally.fainted ? 0.18 : -1;
	if (move.id === 'wideguard') return 0.1;
	if (move.id === 'shedtail') return hpFrac > 0.55 ? 0.25 : -0.5;
	if (move.id === 'revivalblessing') return side.pokemon.some(p => p.fainted) ? 0.5 : -1;
	return 0.06;
}

/** Combine per-slot options into the best few joint options. */
function jointOptions(an: Analyzer, side: Side, perSlot: SlotOption[][], limit: number, rng: RNG): JointOption[] {
	const out: JointOption[] = [];
	const [a, b] = [perSlot[0] || [], perSlot[1] || [{ choice: 'pass', kind: 'pass', score: 0 } as SlotOption]];
	for (const x of a) {
		for (let y of b) {
			if (x.kind === 'switch' && y.kind === 'switch' && x.switchTo === y.switchTo) continue;
			// Only one Mega Evolution per battle: if both could, only the first slot does.
			if (x.choice.endsWith(' mega') && y.choice.endsWith(' mega')) y = { ...y, choice: y.choice.slice(0, -5) };
			let score = x.score + y.score;
			// Don't pile into a target the partner already knocks out.
			if (x.kind === 'move' && y.kind === 'move' && x.target && x.target === y.target && x.target > 0) {
				const t = side.foe.active[x.target - 1];
				const p0 = side.active[0];
				if (t && p0 && an.damageFrac(p0, t, x.moveId!) >= t.hp / t.maxhp) score -= 0.3;
			}
			// Two Protects / two support moves is usually passive.
			if (x.kind === 'move' && y.kind === 'move' && PROTECT_MOVES.has(x.moveId!) && PROTECT_MOVES.has(y.moveId!)) score -= 0.15;
			out.push({ choice: `${x.choice}, ${y.choice}`, slots: [x, y], score });
		}
	}
	if (!out.length) out.push({ choice: 'default', slots: [], score: 0 });
	out.sort((p, q) => q.score - p.score);
	// Keep the top options plus a couple of random ones for diversity.
	const top = out.slice(0, limit);
	const rest = out.slice(limit);
	for (let i = 0; i < 2 && rest.length; i++) {
		top.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
	}
	return top;
}

/** A Protect gives up a turn of damage; repeated Protects usually fail. */
function protectTempo(opt: JointOption, side: Side) {
	let v = 0;
	opt.slots.forEach((slot, i) => {
		if (slot.kind !== 'move' || !slot.moveId || !PROTECT_MOVES.has(slot.moveId)) return;
		v -= 0.07;
		// Consecutive Protects succeed only 1/3 of the time.
		if (side.active[i]?.volatiles['stall']) v -= 0.3;
	});
	return v;
}

function slotOptionsFor(an: Analyzer, side: Side, request: any, forced: boolean, perSlotLimit: number, keepProtect: boolean): SlotOption[][] {
	const result: SlotOption[][] = [];
	const slots = side.active.length;
	for (let slot = 0; slot < slots; slot++) {
		const opts = enumerateSlot(an.battle, side, slot, request, forced);
		for (const o of opts) o.score = forced ? 0 : scoreSlot(an, side, slot, o);
		opts.sort((x, y) => y.score - x.score);
		let kept = opts.slice(0, perSlotLimit);
		if (keepProtect) {
			const protect = opts.find(o => o.moveId && PROTECT_MOVES.has(o.moveId));
			if (protect && !kept.includes(protect)) kept.push(protect);
		}
		const sw = opts.filter(o => o.kind === 'switch');
		if (!forced && sw.length && !kept.some(o => o.kind === 'switch')) kept.push(sw[0]);
		if (forced) kept = opts;
		result.push(kept);
	}
	return result;
}

/* ------------------------------------------------------------------------------------------ */
/* Repeated Protects on the last Pokémon                                                        */
/* ------------------------------------------------------------------------------------------ */

/** A field effect this close to running out (in turns) can be stalled out with Protect. */
const STALL_OUT_TURNS = 2;
/** A foe with this few attacks left can be run out of PP. */
const PP_STALL_MAX = 2;
const SEMI_INVULNERABLE = ['fly', 'bounce', 'dig', 'dive', 'phantomforce', 'shadowforce', 'skydrop'];

const hpLeft = (p: Pokemon) => p.hp / p.maxhp;
const activeFoes = (p: Pokemon) => p.side.foe.active.filter(f => f && !f.fainted);
const running = (state: any) => !!state && state.duration > 0 && state.duration <= STALL_OUT_TURNS;

/** Damage as a fraction of the target's max HP if the move connects (damageFrac weighs in accuracy). */
function damageOnHit(an: Analyzer, source: Pokemon, target: Pokemon, moveId: string) {
	const acc = an.battle.dex.moves.get(moveId).accuracy;
	const sure = acc === true || source.hasAbility('noguard') || target.hasAbility('noguard');
	return an.damageFrac(source, target, moveId) / (sure ? 1 : Math.min(1, (acc as number) / 100));
}

/**
 * HP gained (+) or lost (-) at the end of each turn, as a fraction of max HP, from status,
 * items, Abilities, weather, terrain and the like. Healing counts only up to the HP missing.
 */
function endOfTurnChange(p: Pokemon): number {
	const battle = p.battle;
	const weather = p.effectiveWeather();
	const rain = weather === 'raindance' || weather === 'primordialsea';
	const sun = weather === 'sunnyday' || weather === 'desolateland';
	const poisoned = p.status === 'psn' || p.status === 'tox';

	let heal = 0;
	if (p.hasItem('leftovers') || (p.hasItem('blacksludge') && p.hasType('Poison'))) heal += 1 / 16;
	if (p.volatiles['ingrain']) heal += 1 / 16;
	if (p.volatiles['aquaring']) heal += 1 / 16;
	if (battle.field.isTerrain('grassyterrain') && p.isGrounded()) heal += 1 / 16;
	if (rain && p.hasAbility('raindish')) heal += 1 / 16;
	if (rain && p.hasAbility('dryskin')) heal += 1 / 8;
	if ((weather === 'hail' || weather === 'snowscape') && p.hasAbility('icebody')) heal += 1 / 16;
	if (poisoned && p.hasAbility('poisonheal')) heal += 1 / 8;
	const wish = p.side.slotConditions[p.position]?.['wish'];
	if (wish) heal += (wish.hp ?? p.maxhp / 2) / p.maxhp;
	// Leech Seed feeds whoever stands where the seeder stood.
	for (const foe of activeFoes(p)) {
		const seed = foe.volatiles['leechseed'];
		if (seed && !foe.hasAbility(['magicguard', 'liquidooze']) && battle.getAtSlot(seed.sourceSlot) === p) heal += foe.maxhp / 8 / p.maxhp;
	}
	if (p.volatiles['healblock']) heal = 0;
	heal = Math.min(heal, 1 - hpLeft(p));

	let hurt = 0;
	if (!p.hasAbility('magicguard')) {
		if (p.status === 'brn') hurt += 1 / 16;
		if (p.status === 'psn' && !p.hasAbility('poisonheal')) hurt += 1 / 8;
		if (p.status === 'tox' && !p.hasAbility('poisonheal')) hurt += Math.min(15, (p.statusState.stage ?? 0) + 1) / 16;
		if (p.volatiles['leechseed']) hurt += 1 / 8;
		if (p.volatiles['saltcure']) hurt += p.hasType(['Water', 'Steel']) ? 1 / 4 : 1 / 8;
		if (p.volatiles['curse']) hurt += 1 / 4;
		if (p.volatiles['partiallytrapped']) hurt += 1 / (p.volatiles['partiallytrapped'].boundDivisor ?? 8);
		if (p.volatiles['nightmare'] && p.status === 'slp') hurt += 1 / 4;
		if ((weather === 'sandstorm' || weather === 'hail') && p.runStatusImmunity(weather)) hurt += 1 / 16;
		if (sun && p.hasAbility(['dryskin', 'solarpower'])) hurt += 1 / 8;
		if (p.hasItem('stickybarb') || (p.hasItem('blacksludge') && !p.hasType('Poison'))) hurt += 1 / 8;
		if (p.status === 'slp' && activeFoes(p).some(f => f.hasAbility('baddreams'))) hurt += 1 / 8;
	}
	return heal - hurt;
}

/** How a Pokémon fares against the foes in front of it: damage dealt and taken, and how many it outspeeds. */
function standing(an: Analyzer, p: Pokemon) {
	let dealt = 0, taken = 0, outsped = 0;
	for (const foe of activeFoes(p)) {
		dealt += an.bestDamage(p, foe);
		taken += an.bestDamage(foe, p);
		if (p.getActionSpeed() > foe.getActionSpeed()) outsped++;
	}
	return { dealt, taken, outsped };
}

/**
 * True if the last Pokémon is better off once a field effect is gone, judged by removing it
 * on a scratch copy: the damage trade shifts its way, or it moves before a foe it now trails.
 */
function betterOffWithout(json: string, sideIndex: number, now: ReturnType<typeof standing>, remove: (b: Battle) => void) {
	try {
		const an = new Analyzer(json);
		remove(an.battle);
		const self = an.battle.sides[sideIndex].active.find(p => p && !p.fainted);
		if (!self) return false;
		const then = standing(an, self);
		return then.dealt - then.taken > now.dealt - now.taken + 0.05 || then.outsped > now.outsped;
	} catch {
		return false;
	}
}

/**
 * A side's last Pokémon has no partner to buy time for, so a Protect right after another
 * (1 in 3 to work, then 1 in 9) only delays the loss unless the stalled turn is worth something
 * by itself. Returns what makes it worth trying, or null when it would just be fishing.
 */
export function repeatProtectReason(json: string, sideIndex: number): string | null {
	const an = new Analyzer(json);
	const battle = an.battle;
	const side = battle.sides[sideIndex];
	const self = side.active.find(p => p && !p.fainted);
	if (!self) return null;
	const foes = activeFoes(self);
	const foeLeft = side.foe.pokemon.filter(p => !p.fainted).length;

	// A charged attack lands this turn and would knock us out, and we can't win first.
	for (const foe of foes) {
		const charging = foe.volatiles['twoturnmove'];
		if (!charging) continue;
		const charged = battle.dex.moves.get(charging.move);
		if (charged.category === 'Status' || !charged.flags['protect'] || charged.breaksProtect) continue;
		if (damageOnHit(an, foe, self, charged.id) < hpLeft(self)) continue;
		const winsFirst = foeLeft === 1 && !SEMI_INVULNERABLE.some(id => foe.volatiles[id]) && self.moveSlots.some(ms => {
			if (ms.pp <= 0 || ms.disabled) return false;
			const move = battle.dex.moves.get(ms.id);
			const first = move.priority !== charged.priority ? move.priority > charged.priority : self.getActionSpeed() > foe.getActionSpeed();
			return first && damageOnHit(an, self, foe, ms.id) >= hpLeft(foe);
		});
		if (!winsFirst) return `blocking ${charged.name}`;
	}

	// Running out the clock on a field effect that favours the other side.
	const now = standing(an, self);
	const field = battle.field;
	if (running(field.weatherState) && betterOffWithout(json, sideIndex, now, b => { b.field.clearWeather(); })) return `stalling out ${field.weather}`;
	if (running(field.terrainState) && betterOffWithout(json, sideIndex, now, b => { b.field.clearTerrain(); })) return `stalling out ${field.terrain}`;
	for (const id in field.pseudoWeather) {
		if (running(field.pseudoWeather[id]) && betterOffWithout(json, sideIndex, now, b => { b.field.removePseudoWeather(id); })) return `stalling out ${id}`;
	}
	for (const id in side.foe.sideConditions) {
		if (running(side.foe.sideConditions[id]) &&
			betterOffWithout(json, sideIndex, now, b => { b.sides[1 - sideIndex].removeSideCondition(id); })) return `stalling out ${id}`;
	}
	// ...or on something that is holding us back.
	for (const id of ['disable', 'throatchop', 'healblock']) if (running(self.volatiles[id])) return `waiting out ${id}`;

	// Each stalled turn heals us, or costs them more than it costs us.
	const change = endOfTurnChange(self);
	if (change > 0) return 'passive healing';
	const drain = foes.reduce((sum, foe) => sum + Math.max(0, -endOfTurnChange(foe)), 0);
	if (drain > Math.max(0, -change)) return 'passive damage';
	for (const foe of foes) {
		if (foe.volatiles['perishsong'] && !self.volatiles['perishsong']) return 'perish count';
		if (side.foe.slotConditions[foe.position]?.['futuremove']) return 'future attack';
		if (foe.volatiles['yawn'] && !foe.status) return 'foe falling asleep';
	}
	// Speed Boost turns a stalled turn into the first move.
	if (self.hasAbility('speedboost') && self.boosts.spe < 6 && now.outsped < foes.length) return 'Speed Boost';

	// PP stall: nothing on the bench, and every foe is nearly out of attacks that can hurt us.
	if (foes.length && foeLeft === foes.length) {
		const limit = PP_STALL_MAX * (self.hasAbility('pressure') ? 2 : 1);
		const attacksLeft = (foe: Pokemon) => foe.moveSlots.reduce((n, ms) => n + (an.damageFrac(foe, self, ms.id) > 0 ? ms.pp : 0), 0);
		if (foes.every(foe => attacksLeft(foe) <= limit)) return 'PP stall';
	}
	return null;
}

/** True if this would be a repeat Protect from a side's last Pokémon. */
function isRepeatProtect(side: Side, slot: number, opt: SlotOption) {
	// The stall counter is what makes the next Protect likely to fail.
	return !!opt.moveId && PROTECT_MOVES.has(opt.moveId) && !!side.active[slot]?.volatiles['stall'] &&
		side.pokemon.filter(p => !p.fainted).length === 1;
}

/** Takes repeat Protects away from a side's last Pokémon unless there's a reason for one. */
function dropFishingProtects(json: string, side: Side, perSlot: SlotOption[][]) {
	perSlot.forEach((opts, i) => {
		const others = opts.filter(o => !isRepeatProtect(side, i, o));
		if (!others.length || others.length === opts.length) return;
		if (!repeatProtectReason(json, side.n)) perSlot[i] = others;
	});
}

/**
 * True if a side's last Pokémon is knocked out next turn whatever it does: the foes deal
 * enough between them, and it can't win or remove enough of that damage by knocking one out
 * first. Only counts attacks the foes are sure to have ready (not asleep, recharging or needing
 * a turn to charge), so a stalled turn that wasted one of those still counts for something.
 */
function doomed(b: Battle, sideIndex: number): boolean {
	const an = new Analyzer(b);
	const side = b.sides[sideIndex];
	const self = side.active.find(p => p && !p.fainted);
	if (!self || side.pokemon.filter(p => !p.fainted).length !== 1) return false;
	const threat = (foe: Pokemon) => {
		if (foe.volatiles['mustrecharge'] || foe.status === 'frz' || (foe.status === 'slp' && foe.statusState.time > 1)) return 0;
		const charging = foe.volatiles['twoturnmove']?.move;
		let best = 0;
		for (const ms of foe.moveSlots) {
			if (ms.pp <= 0 || (charging ? ms.id !== charging : b.dex.moves.get(ms.id).flags['charge'])) continue;
			best = Math.max(best, an.damageFrac(foe, self, ms.id));
		}
		return best;
	};
	const hits = activeFoes(self).map(foe => ({
		dmg: threat(foe),
		// We can knock this one out before it moves.
		beaten: self.moveSlots.some(ms => ms.pp > 0 && damageOnHit(an, self, foe, ms.id) >= hpLeft(foe) &&
			(b.dex.moves.get(ms.id).priority > 0 || self.getActionSpeed() > foe.getActionSpeed())),
	}));
	const total = hits.reduce((sum, h) => sum + h.dmg, 0);
	if (total < hpLeft(self)) return false;
	const lastFoe = side.foe.pokemon.filter(p => !p.fainted).length === 1;
	return !hits.some(h => h.beaten && (lastFoe || total - h.dmg < hpLeft(self)));
}

/* ------------------------------------------------------------------------------------------ */
/* Static evaluation                                                                            */
/* ------------------------------------------------------------------------------------------ */

function monValue(p: Pokemon): number {
	if (p.fainted || p.hp <= 0) return 0;
	let v = 0.25 + 0.85 * (p.hp / p.maxhp);
	const physical = p.moveSlots.filter(m => p.battle.dex.moves.get(m.id).category === 'Physical').length >= 2;
	switch (p.status) {
	case 'brn': v -= physical ? 0.3 : 0.08; break;
	case 'par': v -= 0.15; break;
	case 'slp': v -= 0.3; break;
	case 'frz': v -= 0.35; break;
	case 'psn': v -= 0.08; break;
	case 'tox': v -= 0.14; break;
	}
	if (p.isActive) {
		const b = p.boosts;
		const atk = physical ? b.atk : b.spa;
		v += 0.09 * Math.max(-4, Math.min(4, atk)) + 0.06 * Math.max(-3, Math.min(3, b.spe));
		v += 0.035 * (Math.max(-3, Math.min(3, b.def)) + Math.max(-3, Math.min(3, b.spd)));
		if (p.volatiles['substitute']) v += 0.1;
		if (p.volatiles['confusion']) v -= 0.08;
		if (p.volatiles['leechseed'] || p.volatiles['saltcure']) v -= 0.06;
	}
	return Math.max(0, v);
}

function sideValue(side: Side): number {
	let v = 0;
	for (const p of side.pokemon) v += monValue(p);
	const sc = side.sideConditions;
	if (sc['tailwind']) {
		// Tailwind only helps once Trick Room is gone; count the turns left after it ends.
		const tr = side.battle.field.getPseudoWeather('trickroom');
		const turns = (sc['tailwind'].duration ?? 2) - (tr ? tr.duration ?? 0 : 0);
		if (turns > 0) v += 0.12 + 0.07 * turns;
	}
	if (sc['reflect']) v += 0.04 * (sc['reflect'].duration ?? 3);
	if (sc['lightscreen']) v += 0.04 * (sc['lightscreen'].duration ?? 3);
	if (sc['auroraveil']) v += 0.06 * (sc['auroraveil'].duration ?? 3);
	return v;
}

export function evaluate(battle: Battle, sideIndex: number): number {
	const me = battle.sides[sideIndex];
	const foe = battle.sides[1 - sideIndex];
	if (battle.ended) {
		if (battle.winner === me.name) return 100;
		if (battle.winner === foe.name) return -100;
		return 0;
	}
	let v = sideValue(me) - sideValue(foe);
	const tr = battle.field.getPseudoWeather('trickroom');
	if (tr) {
		const slow = slowerTeamAll(me);
		v += slow * 0.1 * (tr.duration ?? 2);
	}
	return v;
}

function slowerTeamAll(side: Side) {
	const avg = (s: Side) => {
		const alive = s.pokemon.filter(p => !p.fainted);
		return alive.length ? alive.reduce((a, p) => a + p.getStat('spe', false, true), 0) / alive.length : 0;
	};
	return Math.max(-1, Math.min(1, (avg(side.foe) - avg(side)) / 50));
}

/* ------------------------------------------------------------------------------------------ */
/* Rollouts                                                                                     */
/* ------------------------------------------------------------------------------------------ */

function randomSeed(rng: RNG): string {
	const n = () => Math.floor(rng() * 0x10000);
	return `sodium,${[n(), n(), n(), n(), n(), n(), n(), n()].map(x => x.toString(16).padStart(4, '0')).join('')}`;
}

/** `stalling`: our choice is a repeat Protect from our last Pokémon. */
function rollout(json: string, mySide: number, myChoice: string, theirChoice: string, rng: RNG, stalling = false): number | null {
	const b = State.deserializeBattle(json);
	(b as any).resetRNG(randomSeed(rng));
	const ok1 = b.sides[mySide].choose(myChoice);
	const ok2 = b.sides[1 - mySide].choose(theirChoice);
	if (!ok1 || !ok2) return null;
	try {
		if (b.allChoicesDone()) b.commitChoices();
		else return null;
	} catch {
		return null;
	}
	// A stalled turn that leaves us knocked out next turn anyway bought nothing.
	if (stalling && !b.ended && doomed(b, mySide)) return -100;
	return evaluate(b, mySide) + tempo(myChoice) - tempo(theirChoice) + positional(b, mySide);
}

/** Protecting and switching cost a turn of pressure that a one-turn lookahead cannot see. */
function tempo(choice: string) {
	let v = 0;
	for (const part of choice.split(',')) {
		if (part.trim().startsWith('switch')) v -= 0.06;
	}
	return v;
}

/**
 * How much pressure each side can apply next turn: for every active Pokémon, the best
 * fraction of a foe's remaining HP it can remove, weighted by whether it moves first.
 */
export function positional(b: Battle, mySide: number): number {
	if (b.ended) return 0;
	const an = new Analyzer(b);
	const tr = !!b.field.getPseudoWeather('trickroom');
	const pressure = (side: Side) => {
		let total = 0;
		for (const p of side.active) {
			if (!p || p.fainted) continue;
			let best = 0;
			for (const foe of side.foe.active) {
				if (!foe || foe.fainted) continue;
				const frac = an.bestDamage(p, foe) / Math.max(0.05, foe.hp / foe.maxhp);
				const faster = (speedOf(p) > speedOf(foe)) !== tr;
				best = Math.max(best, Math.min(1, frac) * (faster ? 1 : 0.7) + (frac >= 1 && faster ? 0.25 : 0));
			}
			total += best;
		}
		return total;
	};
	return 0.3 * (pressure(b.sides[mySide]) - pressure(b.sides[1 - mySide]));
}

/* ------------------------------------------------------------------------------------------ */
/* Public API                                                                                   */
/* ------------------------------------------------------------------------------------------ */

export function chooseAction(json: string, sideIndex: number, rng: RNG = Math.random, config: AIConfig = DEFAULT_AI): string {
	const an = new Analyzer(json);
	const battle = an.battle;
	const side = battle.sides[sideIndex];
	const foe = side.foe;
	const request = side.activeRequest as any;
	if (!request || request.wait) return 'default';
	if (request.teamPreview) return chooseTeamPreview(battle, sideIndex, rng);

	const forced = !!request.forceSwitch;
	if (forced) return chooseForcedSwitch(an, side, request, rng);

	const perSlot = slotOptionsFor(an, side, request, false, 5, true);
	dropFishingProtects(json, side, perSlot);
	const mine = jointOptions(an, side, perSlot, config.ownJoint, rng);
	if (mine.length === 1) return mine[0].choice;

	// Model the opponent. If they also have a request (normal turn), enumerate theirs.
	const foeRequest = foe.activeRequest as any;
	let theirs: JointOption[];
	if (foeRequest && !foeRequest.wait && !foeRequest.forceSwitch && foeRequest.active) {
		theirs = jointOptions(an, foe, slotOptionsFor(an, foe, foeRequest, false, 4, true), config.oppJoint, rng);
	} else {
		theirs = [{ choice: 'default', slots: [], score: 0 }];
	}

	const started = Date.now();
	const base = evaluate(battle, sideIndex) + positional(new Analyzer(json).battle, sideIndex);
	const matrix: number[][] = mine.map(() => theirs.map(() => 0));
	const counts: number[][] = mine.map(() => theirs.map(() => 0));
	const stalling = mine.map(m => m.slots.some((o, slot) => isRepeatProtect(side, slot, o)));
	const sample = (i: number, j: number) => {
		const v = rollout(json, sideIndex, mine[i].choice, theirs[j].choice, rng, stalling[i]);
		if (v === null) return;
		matrix[i][j] += v - base + protectTempo(mine[i], side) - protectTempo(theirs[j], foe);
		counts[i][j]++;
	};
	for (let i = 0; i < mine.length; i++) for (let j = 0; j < theirs.length; j++) sample(i, j);

	const valid = mine.map((_, i) => counts[i].some(c => c > 0));
	const cell = (i: number, j: number) => counts[i][j] ? matrix[i][j] / counts[i][j] : NaN;

	const opponentWeights = () => {
		// The opponent prefers actions that are good for them against our average play.
		const raw = theirs.map((_, j) => {
			let sum = 0, n = 0;
			for (let i = 0; i < mine.length; i++) {
				const c = cell(i, j);
				if (!isNaN(c)) { sum += c; n++; }
			}
			return n ? -sum / n : -Infinity;
		});
		const max = Math.max(...raw);
		const w = raw.map(r => (isFinite(r) ? Math.exp((r - max) / 0.12) : 0));
		// Blend with the heuristic prior so the model is not overconfident.
		const priorMax = Math.max(...theirs.map(t => t.score));
		const prior = theirs.map(t => Math.exp((t.score - priorMax) / 0.25));
		const total = w.reduce((a, b) => a + b, 0) || 1;
		const ptotal = prior.reduce((a, b) => a + b, 0) || 1;
		return w.map((x, j) => 0.7 * x / total + 0.3 * prior[j] / ptotal);
	};

	const scoreAll = () => {
		const p = opponentWeights();
		return mine.map((_, i) => {
			if (!valid[i]) return -Infinity;
			let ev = 0, pw = 0, worst = Infinity;
			for (let j = 0; j < theirs.length; j++) {
				const c = cell(i, j);
				if (isNaN(c)) continue;
				ev += p[j] * c; pw += p[j];
				worst = Math.min(worst, c);
			}
			ev = pw ? ev / pw : 0;
			return config.lambda * ev + (1 - config.lambda) * worst;
		});
	};

	// Refine the most promising candidates with additional samples.
	let scores = scoreAll();
	const order = scores.map((s, i) => [s, i] as const).sort((a, b) => b[0] - a[0]).map(x => x[1]);
	for (const i of order.slice(0, config.refineTop)) {
		if (Date.now() - started > config.budgetMs) break;
		for (let k = 0; k < config.refineSamples; k++) for (let j = 0; j < theirs.length; j++) sample(i, j);
	}
	scores = scoreAll();

	const best = Math.max(...scores);
	const temp = rng() < config.explore ? config.temperature * 3 : config.temperature;
	const weights = scores.map(s => (isFinite(s) ? Math.exp((s - best) / temp) : 0));
	const total = weights.reduce((a, b) => a + b, 0);
	let r = rng() * total;
	for (let i = 0; i < mine.length; i++) {
		r -= weights[i];
		if (r <= 0) return mine[i].choice;
	}
	return mine[0].choice;
}

function chooseForcedSwitch(an: Analyzer, side: Side, request: any, rng: RNG): string {
	const choices: string[] = [];
	const taken = new Set<number>();
	for (let slot = 0; slot < side.active.length; slot++) {
		if (!request.forceSwitch[slot]) { choices.push('pass'); continue; }
		const candidates: number[] = [];
		// Revival Blessing asks for a fainted Pokémon instead.
		const reviving = !!request.side.pokemon[slot]?.reviving;
		request.side.pokemon.forEach((p: any, i: number) => {
			const fainted = p.condition.endsWith(' fnt');
			if (!p.active && fainted === reviving && !taken.has(i + 1)) candidates.push(i + 1);
		});
		if (!candidates.length) { choices.push('pass'); continue; }
		const scored = candidates.map(c => {
			const mon = side.pokemon[c - 1];
			let offense = 0, defense = 0;
			for (const foe of side.foe.active) {
				if (!foe || foe.fainted) continue;
				const dmg = an.bestDamage(mon, foe);
				const faster = speedOf(mon) > speedOf(foe) !== !!an.battle.field.getPseudoWeather('trickroom');
				offense = Math.max(offense, Math.min(1.2, dmg / Math.max(0.05, foe.hp / foe.maxhp)) * (faster ? 1.2 : 0.9));
				defense = Math.max(defense, an.bestDamage(foe, mon) / Math.max(0.05, mon.hp / mon.maxhp));
			}
			return { c, s: offense - 0.6 * Math.min(1.5, defense) + (mon.hp / mon.maxhp) * 0.3 + rng() * 0.12 };
		});
		scored.sort((a, b) => b.s - a.s);
		taken.add(scored[0].c);
		choices.push(`switch ${scored[0].c}`);
	}
	return choices.join(', ');
}

/** Picks 4 of 6 (always including a Mega Evolution) and orders the leads. */
export function chooseTeamPreview(battle: Battle, sideIndex: number, rng: RNG = Math.random): string {
	const an = new Analyzer(JSON.stringify(State.serializeBattle(battle)));
	const side = an.battle.sides[sideIndex];
	const foe = side.foe;
	const mons = side.pokemon;
	const n = mons.length;
	// Matchup matrix: how well each of ours does against each of theirs.
	const m: number[][] = mons.map(a => foe.pokemon.map(b => {
		const off = Math.min(1.2, an.bestDamage(a, b));
		const def = Math.min(1.2, an.bestDamage(b, a));
		const faster = a.getStat('spe', false, true) >= b.getStat('spe', false, true);
		return off * (faster ? 1.15 : 0.9) - def * (faster ? 0.85 : 1.1);
	}));
	const isMega = (p: Pokemon) => !!p.set.item && !!battle.dex.items.get(p.set.item).megaStone;
	const moveIds = (p: Pokemon) => p.moveSlots.map(s => s.id as string);
	const tags = (p: Pokemon) => {
		const ids = moveIds(p);
		return {
			speed: ids.some(id => ['tailwind', 'trickroom', 'icywind', 'electroweb', 'thunderwave'].includes(id)),
			tr: ids.includes('trickroom'),
			support: ids.some(id => ['fakeout', 'followme', 'ragepowder'].includes(id)) || p.set.ability === 'Intimidate',
			weather: ['Drought', 'Drizzle', 'Sand Stream', 'Snow Warning', 'Sand Spit'].includes(p.set.ability) ||
				['Charizardite Y', 'Tyranitarite', 'Abomasite', 'Froslassite'].includes(p.set.item),
		};
	};
	const teamSpeed = (idx: number[]) => idx.reduce((a, i) => a + mons[i].getStat('spe', false, true), 0) / idx.length;

	const subsets: number[][] = [];
	for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) for (let d = c + 1; d < n; d++) {
		const s = [a, b, c, d];
		if (mons.some(isMega) && !s.some(i => isMega(mons[i]))) continue;
		subsets.push(s);
	}
	const scoreSubset = (s: number[]) => {
		let v = 0;
		for (let j = 0; j < foe.pokemon.length; j++) {
			const vals = s.map(i => m[i][j]).sort((x, y) => y - x);
			v += vals[0] * 0.6 + vals[1] * 0.4;
		}
		const t = s.map(i => tags(mons[i]));
		if (t.some(x => x.speed)) v += 0.6;
		if (t.some(x => x.support)) v += 0.4;
		if (t.some(x => x.tr)) v += teamSpeed(s) < 80 ? 0.8 : -0.4;
		// Keep weather setters with their abusers (curated teams bring them together).
		if (t.some(x => x.weather)) v += 0.3;
		return v;
	};
	const scored = subsets.map(s => ({ s, v: scoreSubset(s) + rng() * 0.6 })).sort((a, b) => b.v - a.v);
	const chosen = scored[Math.min(scored.length - 1, rng() < 0.75 ? 0 : 1)].s;

	// Leads: favour speed control, support, weather and the Mega.
	const leadPairs: [number, number][] = [];
	for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) leadPairs.push([chosen[i], chosen[j]]);
	const leadScore = ([a, b]: [number, number]) => {
		const ta = tags(mons[a]), tb = tags(mons[b]);
		let v = 0;
		for (const [t, i] of [[ta, a], [tb, b]] as const) {
			if (t.speed) v += 0.7;
			if (t.support) v += 0.6;
			if (t.weather) v += 0.7;
			if (isMega(mons[i])) v += 0.4;
			for (let j = 0; j < foe.pokemon.length; j++) v += m[i][j] * 0.15;
		}
		if (ta.tr && tb.tr) v -= 0.6;
		if (ta.support && tb.support) v -= 0.3;
		return v + rng() * 0.9;
	};
	leadPairs.sort((x, y) => leadScore(y) - leadScore(x));
	const [l1, l2] = leadPairs[0];
	const back = chosen.filter(i => i !== l1 && i !== l2);
	return `team ${[l1, l2, ...back].map(i => i + 1).join('')}`;
}


/** A simple greedy policy (best-looking move each turn, no lookahead). Used to model a casual player in balance tests. */
export function chooseGreedy(json: string, sideIndex: number, rng: RNG = Math.random): string {
	const an = new Analyzer(json);
	const side = an.battle.sides[sideIndex];
	const request = side.activeRequest as any;
	if (!request || request.wait) return 'default';
	if (request.teamPreview) return chooseTeamPreview(an.battle, sideIndex, rng);
	if (request.forceSwitch) return chooseForcedSwitch(an, side, request, rng);
	const joint = jointOptions(an, side, slotOptionsFor(an, side, request, false, 5, false), 6, rng);
	return joint[0].choice;
}
