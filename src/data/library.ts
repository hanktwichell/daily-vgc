import { SETS_LIBRARY } from './sets-library';
import { Teams, type PokemonSet } from '../engine/ps';

export interface LibrarySet {
	id: string;
	tags: Set<string>;
	/** Items in preference order; the first is the default. */
	items: string[];
	set: PokemonSet;
	isMega: boolean;
}

function parseLibrary(text: string): LibrarySet[] {
	const out: LibrarySet[] = [];
	for (const block of text.split(/\n(?=#)/)) {
		const lines = block.trim().split('\n');
		if (!lines[0]?.startsWith('#')) continue;
		const [id, ...tags] = lines[0].slice(1).trim().split(/\s+/);
		const itemMatch = /@ (.+)$/.exec(lines[1]);
		const items = itemMatch ? itemMatch[1].split('/').map(s => s.trim()) : [];
		if (itemMatch) lines[1] = lines[1].replace(/@ .+$/, `@ ${items[0]}`);
		const team = Teams.import(lines.slice(1).join('\n'));
		if (!team || team.length !== 1) throw new Error(`Could not parse set ${id}`);
		const set = team[0];
		set.level = 50;
		set.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
		for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const) set.evs[stat] ??= 0;
		const isMega = items.some(i => /ite( [XYZ])?$/.test(i) && !['White Herb'].includes(i)) || tags.includes('mega');
		out.push({ id, tags: new Set(tags), items, set, isMega });
	}
	return out;
}

export const LIBRARY: LibrarySet[] = parseLibrary(SETS_LIBRARY);
export const LIBRARY_BY_ID = new Map(LIBRARY.map(s => [s.id, s]));

export function getLibrarySet(id: string): LibrarySet {
	const s = LIBRARY_BY_ID.get(id);
	if (!s) throw new Error(`Unknown set: ${id}`);
	return s;
}

/** Deep copy of a set with a specific item. */
export function materialize(lib: LibrarySet, item = lib.items[0]): PokemonSet {
	const set = JSON.parse(JSON.stringify(lib.set)) as PokemonSet;
	set.item = item || '';
	return set;
}
