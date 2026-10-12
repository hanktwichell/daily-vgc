// Daily puzzle generation. Everything here is deterministic for a given date so every
// player gets the same teams; battle RNG and AI choices are not (see engine/).
import { Dex, FORMAT_ID, type PokemonSet } from '../engine/ps';
import { LIBRARY, type LibrarySet } from './library';
import { OPPONENT_TEAMS, type OpponentTeam } from './opponents';
import { buildTeam } from './team-builder';
import { SeededRNG } from './rng';

/** Puzzle #1 is this date (America/New_York). */
export const LAUNCH_DATE = '2026-10-12';
export const PUZZLE_TIME_ZONE = 'America/New_York';

const dex = Dex.forFormat(FORMAT_ID);

/** YYYY-MM-DD of the puzzle day for an instant (new puzzle at midnight Eastern). */
export function puzzleDateFor(now: Date = new Date()): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: PUZZLE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
	}).formatToParts(now);
	const get = (t: string) => parts.find(p => p.type === t)!.value;
	return `${get('year')}-${get('month')}-${get('day')}`;
}

function dayIndex(date: string) {
	const [y, m, d] = date.split('-').map(Number);
	return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function puzzleNumberFor(date: string) {
	return dayIndex(date) - dayIndex(LAUNCH_DATE) + 1;
}

export function dateForPuzzleNumber(n: number) {
	const ms = (dayIndex(LAUNCH_DATE) + n - 1) * 86400000;
	return new Date(ms).toISOString().slice(0, 10);
}

/** Milliseconds until the next puzzle unlocks. */
export function msUntilNextPuzzle(now: Date = new Date()) {
	const today = puzzleDateFor(now);
	// Step forward in 1-minute increments from a coarse guess; DST-safe and cheap.
	let t = now.getTime() + 60_000;
	let step = 3_600_000;
	while (step >= 1000) {
		while (puzzleDateFor(new Date(t + step)) === today) t += step;
		step = Math.floor(step / 4);
	}
	while (puzzleDateFor(new Date(t)) === today) t += 1000;
	return t - now.getTime();
}

export type Archetype = 'tw' | 'tr' | 'sun' | 'rain' | 'sand' | 'snow' | 'balance';
const ARCHETYPE_WEIGHTS: [Archetype, number][] = [
	['tw', 3], ['tr', 3], ['balance', 3], ['sun', 1.5], ['rain', 1.5], ['sand', 1.2], ['snow', 1],
];
export const ARCHETYPE_NAMES: Record<Archetype, string> = {
	tw: 'Tailwind Offense', tr: 'Trick Room', balance: 'Balance', sun: 'Sun', rain: 'Rain', sand: 'Sand', snow: 'Snow',
};

export interface DailyPuzzle {
	date: string;
	number: number;
	opponent: OpponentTeam;
	opponentTeam: PokemonSet[];
	playerIds: string[];
	playerTeam: PokemonSet[];
	archetype: Archetype;
}

/** Species after Mega Evolution (for typing), else the base species. */
function battleSpecies(lib: LibrarySet) {
	const item = dex.items.get(lib.items[0]);
	if (lib.isMega && item.megaStone) {
		const mega = Object.values(item.megaStone)[0];
		if (mega) return dex.species.get(mega);
	}
	return dex.species.get(lib.set.species);
}

function weaknesses(lib: LibrarySet): string[] {
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
	return dex.species.get(lib.set.species).num;
}

function fitsArchetype(lib: LibrarySet, arch: Archetype) {
	if (arch === 'balance') return !lib.tags.has('use:tr') && !lib.tags.has('set:tr');
	return lib.tags.has(`use:${arch}`) || lib.tags.has(`set:${arch}`);
}

const SPEED_CONTROL = ['tailwind', 'trickroom', 'speedctrl'];
const SUPPORT = ['fakeout', 'intimidate', 'redirect'];
const WEATHERS = ['sun', 'rain', 'sand', 'snow'];

export function generatePlayerTeam(rng: SeededRNG, exclude: Set<number>) {
	const archetype = rng.weighted(ARCHETYPE_WEIGHTS, ([, w]) => w)![0];
	const megaRoll = rng.next();
	const megaTarget = megaRoll < 0.25 ? 0 : megaRoll < 0.8 ? 1 : 2;

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

export function opponentForPuzzle(n: number): OpponentTeam {
	const count = OPPONENT_TEAMS.length;
	const cycle = Math.floor((n - 1) / count);
	const order = new SeededRNG(`daily-vgc:opponents:${cycle}`).shuffle(OPPONENT_TEAMS.map((_, i) => i));
	return OPPONENT_TEAMS[order[(((n - 1) % count) + count) % count]];
}

export function generateDaily(date: string): DailyPuzzle {
	const number = puzzleNumberFor(date);
	const opponent = opponentForPuzzle(number);
	const rng = new SeededRNG(`daily-vgc:${date}`);
	const exclude = new Set(opponent.sets.map(id => natNum(LIBRARY.find(l => l.id === id)!)));
	const { archetype, ids } = generatePlayerTeam(rng, exclude);
	return {
		date, number, opponent,
		opponentTeam: buildTeam(opponent.sets),
		playerIds: ids,
		playerTeam: buildTeam(ids),
		archetype,
	};
}
