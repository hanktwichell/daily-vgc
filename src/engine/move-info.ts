// Move details and type-effectiveness hints shown in the battle controls.
import { State, type Battle } from './ps';
import type { Pokemon } from '../../vendor/ps/sim/pokemon';
import type { MoveHints, TargetHint } from '../shared/types';

const STAT: Record<string, string> = {
	atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', accuracy: 'accuracy', evasion: 'evasiveness',
};
const STATUS: Record<string, string> = {
	brn: 'burn the target', par: 'paralyze the target', psn: 'poison the target', tox: 'badly poison the target',
	slp: 'put the target to sleep', frz: 'freeze the target',
};
const VOLATILE: Record<string, string> = { flinch: 'make the target flinch', confusion: 'confuse the target' };
const RANGE: Record<string, string> = {
	allAdjacentFoes: 'Hits both opposing Pokémon (75% damage each when it hits both)',
	allAdjacent: 'Hits both opposing Pokémon and your partner (75% damage each when it hits more than one)',
	randomNormal: 'Hits a random opposing Pokémon',
	foeSide: 'Affects the opposing side',
	allySide: 'Affects your side',
	allies: 'Affects you and your partner',
	all: 'Affects the whole field',
};
const TAGS: [string, string][] = [
	['contact', 'Contact'], ['sound', 'Sound'], ['punch', 'Punch'], ['bite', 'Bite'], ['slicing', 'Slicing'],
	['pulse', 'Pulse'], ['bullet', 'Ball/Bomb'], ['wind', 'Wind'], ['powder', 'Powder'],
];

/** "lower the target's Defense and Sp. Def by 1" */
function boostPhrase(boosts: Record<string, number>, whose: string): string[] {
	const byAmount = new Map<number, string[]>();
	for (const [stat, n] of Object.entries(boosts)) {
		if (!n) continue;
		byAmount.set(n, [...(byAmount.get(n) ?? []), STAT[stat] ?? stat]);
	}
	return [...byAmount].map(([n, stats]) => {
		const list = stats.length > 1 ? `${stats.slice(0, -1).join(', ')} and ${stats[stats.length - 1]}` : stats[0];
		return `${n > 0 ? 'raise' : 'lower'} ${whose} ${list} by ${Math.abs(n)}`;
	});
}

/** "burn the target" -> "Burns the target" */
function present(phrase: string) {
	const words = phrase.split(' ');
	const i = words[0] === 'badly' ? 1 : 0;
	words[i] += 's';
	const s = words.join(' ');
	return s[0].toUpperCase() + s.slice(1);
}

function withChance(chance: number | undefined, phrase: string) {
	return !chance || chance >= 100 ? present(phrase) : `${chance}% chance to ${phrase}`;
}

/** Secondary effects and other notable properties of a move, as short sentences. */
export function moveEffects(move: any): { effects: string[]; tags: string[] } {
	const effects: string[] = [];
	if (RANGE[move.target]) effects.push(RANGE[move.target]);
	const secondaries = move.secondaries ?? (move.secondary ? [move.secondary] : []);
	for (const s of secondaries) {
		if (s.status && STATUS[s.status]) effects.push(withChance(s.chance, STATUS[s.status]));
		if (s.volatileStatus && VOLATILE[s.volatileStatus]) effects.push(withChance(s.chance, VOLATILE[s.volatileStatus]));
		if (s.boosts) for (const p of boostPhrase(s.boosts, "the target's")) effects.push(withChance(s.chance, p));
		if (s.self?.boosts) for (const p of boostPhrase(s.self.boosts, "the user's")) effects.push(withChance(s.chance, p));
	}
	if (move.category === 'Status') {
		if (move.boosts) {
			const whose = move.target === 'self' ? "the user's" : move.target === 'adjacentAlly' ? "the partner's" : "the target's";
			for (const p of boostPhrase(move.boosts, whose)) effects.push(present(p));
		}
		if (move.status && STATUS[move.status]) effects.push(present(STATUS[move.status]));
	}
	if (move.self?.boosts) for (const p of boostPhrase(move.self.boosts, "the user's")) effects.push(present(p));
	if (move.selfBoost?.boosts) for (const p of boostPhrase(move.selfBoost.boosts, "the user's")) effects.push(present(p));
	if (move.drain) effects.push(`Heals the user by ${Math.round(move.drain[0] / move.drain[1] * 100)}% of the damage dealt`);
	if (move.recoil) effects.push(`User takes ${Math.round(move.recoil[0] / move.recoil[1] * 100)}% of the damage dealt as recoil`);
	if (Array.isArray(move.multihit)) effects.push(`Hits ${move.multihit[0]}-${move.multihit[1]} times`);
	else if (move.multihit) effects.push(`Hits ${move.multihit} times`);
	if (move.willCrit) effects.push('Always lands a critical hit');
	else if (move.critRatio > 1) effects.push('High critical-hit ratio');
	if (move.selfSwitch && move.category !== 'Status') effects.push('User switches out after attacking');
	if (move.priority > 0) effects.push(`Moves first (priority +${move.priority})`);
	else if (move.priority < 0) effects.push(`Moves last (priority ${move.priority})`);
	if (move.flags?.charge) effects.push('Charges on the first turn, attacks on the second');
	if (move.flags?.recharge) effects.push('User must recharge next turn');
	const tags = TAGS.filter(([flag]) => move.flags?.[flag]).map(([, label]) => label);
	return { effects, tags };
}

/* ------------------------------------------------------------------------------------------ */
/* Type effectiveness against the Pokémon on the field                                         */
/* ------------------------------------------------------------------------------------------ */

const ABSORB: Record<string, string> = {
	waterabsorb: 'Water', stormdrain: 'Water', dryskin: 'Water', voltabsorb: 'Electric', lightningrod: 'Electric',
	motordrive: 'Electric', flashfire: 'Fire', wellbakedbody: 'Fire', sapsipper: 'Grass', eartheater: 'Ground',
};
const ABILITY_IGNORERS = ['moldbreaker', 'teravolt', 'turboblaze', 'myceliummight'];

function hintFor(b: Battle, src: Pokemon, tgt: Pokemon | null | undefined, moveId: string): TargetHint | null {
	if (!tgt || tgt.fainted || tgt === src) return null;
	const move = b.dex.getActiveMove(moveId) as any;
	if (move.category === 'Status') return null;
	try {
		b.singleEvent('ModifyType', move, null, src, tgt, move, move);
		b.runEvent('ModifyType', src, tgt, move, move);
		b.runEvent('ModifyMove', src, tgt, move, move);
	} catch { /* fall back to the move's listed type */ }
	if (move.ignoreImmunity === undefined) move.ignoreImmunity = false;
	if (!tgt.runImmunity(move)) return { mult: 0 };
	if (!src.hasAbility(ABILITY_IGNORERS) && !move.ignoreAbility) {
		const ability = tgt.getAbility();
		const immune = (ABSORB[ability.id] && ABSORB[ability.id] === move.type && tgt.hasAbility(ability.id)) ||
			(move.flags.bullet && tgt.hasAbility('bulletproof')) ||
			(move.flags.sound && tgt.hasAbility('soundproof')) ||
			(move.flags.wind && tgt.hasAbility('windrider')) ||
			(tgt.side === src.side && tgt.hasAbility('telepathy'));
		if (immune) return { mult: 0, note: ability.name };
	}
	const mult = 2 ** tgt.runEffectiveness(move);
	if (move.damage || move.damageCallback || move.ohko) return { mult: 1, note: 'fixed damage' };
	return { mult };
}

function slotHints(b: Battle, sideIndex: number, slot: number, moveIds: string[]) {
	const side = b.sides[sideIndex];
	const src = side.active[slot];
	return moveIds.map(id => {
		const out: Record<number, TargetHint> = {};
		if (!src || src.fainted) return out;
		side.foe.active.forEach((t, i) => { const h = hintFor(b, src, t, id); if (h) out[i + 1] = h; });
		side.active.forEach((t, i) => { const h = hintFor(b, src, t, id); if (h) out[-(i + 1)] = h; });
		return out;
	});
}

/**
 * For each active slot and move in the request: how effective it is on each Pokémon on the
 * field (keyed by target location: 1/2 foes, -1/-2 your side). `mega` holds the same for
 * slots that can Mega Evolve this turn, since that can change the user's type and Ability.
 */
export function moveHints(json: string, request: any, sideIndex = 0): { hints: MoveHints; mega: MoveHints } {
	const hints: MoveHints = {}, mega: MoveHints = {};
	if (!request?.active) return { hints, mega };
	const b = State.deserializeBattle(json);
	request.active.forEach((a: any, slot: number) => {
		if (!a) return;
		hints[slot] = slotHints(b, sideIndex, slot, a.moves.map((m: any) => m.id));
	});
	request.active.forEach((a: any, slot: number) => {
		const p = b.sides[sideIndex].active[slot];
		if (!a?.canMegaEvo || !p?.canMegaEvo) return;
		const clone = State.deserializeBattle(json);
		const q = clone.sides[sideIndex].active[slot];
		q.formeChange(q.canMegaEvo as string, q.getItem(), true);
		mega[slot] = slotHints(clone, sideIndex, slot, a.moves.map((m: any) => m.id));
	});
	return { hints, mega };
}
