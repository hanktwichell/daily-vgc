// Daily puzzle generation. Everything here is deterministic for a given date so every
// player gets the same teams; battle RNG and AI choices are not (see engine/).
import { Dex, FORMAT_ID, type PokemonSet } from '../engine/ps';
import { LIBRARY, type LibrarySet } from './library';
import { opponentForPuzzle, type OpponentTeam } from './opponents';
import { META_TEAMS, type MetaTeam } from './meta-teams';
import { buildTeam } from './team-builder';
import { SeededRNG } from './rng';
import { matchupScore } from '../engine/matchup';
import CALIBRATED from './calibrated.json';

export { opponentForPuzzle };
export { LAUNCH_DATE, PUZZLE_TIME_ZONE, puzzleDateFor, puzzleNumberFor, dateForPuzzleNumber, msUntilNextPuzzle } from './calendar';
import { puzzleNumberFor } from './calendar';

const dex = Dex.forFormat(FORMAT_ID);

export type Archetype = 'tw' | 'tr' | 'sun' | 'rain' | 'sand' | 'snow' | 'balance';
const ARCHETYPE_WEIGHTS: [Archetype, number][] = [
	['tw', 3], ['tr', 3], ['balance', 3], ['sun', 1.5], ['rain', 1.5], ['sand', 1.2], ['snow', 1],
];
export const ARCHETYPE_NAMES: Record<Archetype, string> = {
	tw: 'Tailwind Offense', tr: 'Trick Room', balance: 'Balance', sun: 'Sun', rain: 'Rain', sand: 'Sand', snow: 'Snow',
};

export type Mode = 'normal' | 'hard';

export interface DailyPuzzle {
	mode: Mode;
	date: string;
	number: number;
	/** The day's themed team, or a meta team in hard mode. */
	opponent: OpponentTeam | MetaTeam;
	opponentTeam: PokemonSet[];
	playerIds: string[];
	playerTeam: PokemonSet[];
	archetype: Archetype;
	/** Short description of the player's team shown at team preview. */
	label: string;
	/** Use the looser AI (hard-mode days where even the best pairing is lopsided). */
	relaxedAi?: boolean;
}

const speciesCache = new Map<string, ReturnType<typeof dex.species.get>>();
const weaknessCache = new Map<string, string[]>();

/** Species after Mega Evolution (for typing), else the base species. */
function battleSpecies(lib: LibrarySet) {
	let cached = speciesCache.get(lib.id);
	if (!cached) speciesCache.set(lib.id, cached = computeBattleSpecies(lib));
	return cached;
}

function computeBattleSpecies(lib: LibrarySet) {
	const item = dex.items.get(lib.items[0]);
	if (lib.isMega && item.megaStone) {
		const mega = Object.values(item.megaStone)[0];
		if (mega) return dex.species.get(mega);
	}
	return dex.species.get(lib.set.species);
}

function weaknesses(lib: LibrarySet): string[] {
	let cached = weaknessCache.get(lib.id);
	if (!cached) weaknessCache.set(lib.id, cached = computeWeaknesses(lib));
	return cached;
}

function computeWeaknesses(lib: LibrarySet): string[] {
	const species = battleSpecies(lib);
	const out: string[] = [];
	for (const type of dex.types.names()) {
		if (type === 'Stellar') continue;
		if (!dex.getImmunity(type, species.types)) continue;
		if (dex.getEffectiveness(type, species.types) > 0) out.push(type);
	}
	if (lib.set.ability === 'Levitate') return out.filter(t => t !== 'Ground');
	return out;
}

function natNum(lib: LibrarySet) {
	return battleSpecies(lib).num;
}

function fitsArchetype(lib: LibrarySet, arch: Archetype) {
	if (arch === 'balance') return !lib.tags.has('use:tr') && !lib.tags.has('set:tr');
	return lib.tags.has(`use:${arch}`) || lib.tags.has(`set:${arch}`);
}

const SPEED_CONTROL = ['tailwind', 'trickroom', 'speedctrl'];
const SUPPORT = ['fakeout', 'intimidate', 'redirect'];
const WEATHERS = ['sun', 'rain', 'sand', 'snow'];

export function generatePlayerTeam(rng: SeededRNG, exclude: Set<number>, archetype: Archetype, megaTarget: number) {

	const team: LibrarySet[] = [];
	const nums = new Set(exclude);
	const has = (tag: string) => team.some(s => s.tags.has(tag));
	const megaCount = () => team.filter(s => s.isMega).length;

	const add = (lib: LibrarySet | undefined) => {
		if (!lib) return;
		team.push(lib);
		nums.add(natNum(lib));
	};
	const weatherOf = (l: LibrarySet) => WEATHERS.find(w => l.tags.has(`set:${w}`));
	const clashes = (lib: LibrarySet) => {
		const w = weatherOf(lib);
		return !!w && team.some(s => { const o = weatherOf(s); return o && o !== w; });
	};
	const available = (lib: LibrarySet) => !nums.has(natNum(lib)) && !team.includes(lib) && !clashes(lib) &&
		lib.set.species !== 'Ditto' &&
		(!lib.isMega || megaCount() < megaTarget);

	const baseWeight = (lib: LibrarySet) => {
		let w = 1;
		if (lib.tags.has('whimsy')) w *= 1.4;
		if (lib.tags.has('meta')) w *= 0.35;
		if (archetype === 'tr') {
			if (lib.tags.has('fast')) w *= 0.15;
			if (lib.tags.has('slow') || lib.tags.has('use:tr')) w *= 2;
		} else if (lib.tags.has('use:tr') && !lib.tags.has(`use:${archetype}`)) {
			w *= 0.35;
		}
		if (archetype === 'tw' && lib.tags.has('slow')) w *= 0.3;
		// Don't mix rooms with Tailwind, or set a weather that fights the plan.
		const setsRoom = lib.tags.has('set:tr') || lib.tags.has('trickroom');
		if (archetype !== 'tr' && setsRoom) w *= 0.02;
		if (archetype === 'tr' && (lib.tags.has('set:tw') || lib.tags.has('tailwind'))) w *= 0.1;
		for (const weather of WEATHERS) {
			if (lib.tags.has(`set:${weather}`) && weather !== archetype) {
				w *= archetype === 'balance' || archetype === 'tw' || archetype === 'tr' ? 0.4 : 0.03;
			}
		}
		return w;
	};

	const synergyWeight = (lib: LibrarySet) => {
		let w = baseWeight(lib);
		if (fitsArchetype(lib, archetype)) w *= 3;
		if (!SPEED_CONTROL.some(has) && SPEED_CONTROL.some(t => lib.tags.has(t))) w *= 2;
		if (!SUPPORT.some(has) && SUPPORT.some(t => lib.tags.has(t))) w *= 2;
		const phys = team.filter(s => s.tags.has('physical')).length;
		const spec = team.filter(s => s.tags.has('special')).length;
		if (lib.tags.has('physical') && phys > spec + 1) w *= 0.5;
		if (lib.tags.has('special') && spec > phys + 1) w *= 0.5;
		// Avoid stacking weaknesses and types.
		const weakCount = new Map<string, number>();
		for (const s of team) for (const t of weaknesses(s)) weakCount.set(t, (weakCount.get(t) || 0) + 1);
		for (const t of weaknesses(lib)) {
			const c = weakCount.get(t) || 0;
			if (c >= 2) w *= 0.25;
			else if (c === 1) w *= 0.8;
		}
		const types = battleSpecies(lib).types;
		for (const type of types) {
			if (team.filter(s => battleSpecies(s).types.includes(type)).length >= 1) w *= 0.45;
		}
		if (lib.isMega && megaCount() < megaTarget) w *= 2.5;
		return w;
	};

	const pickFrom = (filter: (l: LibrarySet) => boolean, weight = synergyWeight) =>
		rng.weighted(LIBRARY.filter(l => available(l) && filter(l)), weight);

	// 1. Weather / room setter (Tailwind teams get one, sometimes two).
	if (archetype !== 'balance') {
		add(pickFrom(l => l.tags.has(`set:${archetype}`)));
	}
	// 2. Mega Evolutions, preferring ones that fit the plan.
	while (megaCount() < megaTarget) {
		const before = team.length;
		add(pickFrom(l => l.isMega));
		if (team.length === before) break;
	}
	// 3. Abusers.
	if (archetype !== 'balance') {
		while (team.filter(l => fitsArchetype(l, archetype)).length < 3) {
			const before = team.length;
			add(pickFrom(l => l.tags.has(`use:${archetype}`) && !l.isMega));
			if (team.length === before) break;
		}
	}
	// 4. Support and speed control.
	if (!SUPPORT.some(has)) add(pickFrom(l => SUPPORT.some(t => l.tags.has(t)) && !l.isMega));
	if (!SPEED_CONTROL.some(has) && archetype !== 'tr') add(pickFrom(l => SPEED_CONTROL.some(t => l.tags.has(t)) && !l.isMega));
	// 5. Fill.
	while (team.length < 6) {
		const before = team.length;
		add(pickFrom(l => !l.isMega || megaCount() < megaTarget));
		if (team.length === before) throw new Error('Could not fill team');
	}
	// Put the plan's key pieces first so the default order is sensible.
	return { archetype, ids: team.slice(0, 6).map(l => l.id) };
}

/**
 * How much the player's team is favoured on paper. Small, so the battle is a real fight
 * against a strong AI; teams without a Mega get a bigger edge.
 */
const TARGET_EDGE = [0.9, 0.3, 0.1];
const CANDIDATES = 16;

export interface Candidate { ids: string[]; team: PokemonSet[]; diff: number; archetype: Archetype }

/**
 * Candidate player teams for a date, best (closest to the target matchup) first.
 * Deterministic for the date.
 */
export function candidateTeams(date: string, opponentTeam: PokemonSet[], opponent: OpponentTeam, exhaustive = false): Candidate[] {
	const rng = new SeededRNG(`daily-vgc:${date}`);
	const exclude = new Set(opponent.sets.map(id => natNum(LIBRARY.find(l => l.id === id)!)));
	const megaRoll = rng.next();
	const megaTarget = megaRoll < 0.25 ? 0 : megaRoll < 0.8 ? 1 : 2;
	const all: Candidate[] = [];
	// Up to three archetypes; stop early once a team is close to the target edge.
	for (let attempt = 0; attempt < 3 && (exhaustive || !all.some(c => c.diff < 0.25)); attempt++) {
		const archetype = rng.weighted(ARCHETYPE_WEIGHTS, ([, w]) => w)![0];
		for (let i = 0; i < CANDIDATES; i++) {
			const { ids } = generatePlayerTeam(rng, exclude, archetype, megaTarget);
			const team = buildTeam(ids);
			const diff = Math.abs(matchupScore(team, opponentTeam) - TARGET_EDGE[megaTarget]);
			all.push({ ids, team, diff, archetype });
		}
	}
	return all.sort((a, b) => a.diff - b.diff);
}

/** Teams chosen offline by simulation (scripts/calibrate.ts), keyed by date. */
const calibrated = CALIBRATED as Record<string, { ids?: string[]; archetype?: Archetype; hard?: string; hardRelaxed?: boolean }>;

export function generateDaily(date: string): DailyPuzzle {
	const number = puzzleNumberFor(date);
	const opponent = opponentForPuzzle(number);
	const opponentTeam = buildTeam(opponent.sets);
	const fixed = calibrated[date];
	if (fixed?.ids && fixed.archetype && fixed.ids.every(id => LIBRARY.some(l => l.id === id))) {
		return {
			mode: 'normal', date, number, opponent, opponentTeam, playerIds: fixed.ids, playerTeam: buildTeam(fixed.ids),
			archetype: fixed.archetype, label: ARCHETYPE_NAMES[fixed.archetype],
		};
	}
	const best = candidateTeams(date, opponentTeam, opponent)[0];
	return {
		mode: 'normal', date, number, opponent, opponentTeam,
		playerIds: best.ids,
		playerTeam: best.team,
		archetype: best.archetype,
		label: ARCHETYPE_NAMES[best.archetype],
	};
}

/* ------------------------------------------------------------------------------------------ */
/* Hard mode: the day's themed team against a meta team                                         */
/* ------------------------------------------------------------------------------------------ */

/** On paper the meta team should be favoured, but not overwhelmingly. */
const HARD_TARGET = -0.35;

export interface HardCandidate { meta: MetaTeam; team: PokemonSet[]; score: number; diff: number }

/** Meta teams ordered by how close their matchup against the themed team is to the target. */
export function hardCandidates(themedTeam: PokemonSet[]): HardCandidate[] {
	return META_TEAMS.map(meta => {
		const team = buildTeam(meta.sets);
		const score = matchupScore(themedTeam, team);
		return { meta, team, score, diff: Math.abs(score - HARD_TARGET) };
	}).sort((a, b) => a.diff - b.diff);
}

export function generateHard(date: string): DailyPuzzle {
	const number = puzzleNumberFor(date);
	const themed = opponentForPuzzle(number);
	const playerTeam = buildTeam(themed.sets);
	const pinned = calibrated[date]?.hard;
	let meta = pinned ? META_TEAMS.find(m => m.id === pinned) : undefined;
	if (!meta) {
		// Pick among the three closest so a themed team doesn't always meet the same opponent.
		const top = hardCandidates(playerTeam).slice(0, 3);
		meta = new SeededRNG(`daily-vgc:hard:${date}`).pick(top).meta;
	}
	return {
		mode: 'hard', date, number, opponent: meta, opponentTeam: buildTeam(meta.sets),
		playerIds: themed.sets, playerTeam, archetype: 'balance',
		label: `${themed.name} (${themed.trainer}'s team)`,
		relaxedAi: !!(pinned && meta.id === pinned && calibrated[date]?.hardRelaxed),
	};
}

export function generatePuzzle(date: string, mode: Mode): DailyPuzzle {
	return mode === 'hard' ? generateHard(date) : generateDaily(date);
}
