import type { PokemonSet } from '../engine/ps';
import { getLibrarySet, materialize, type LibrarySet } from './library';

/** Assigns items so no two Pokémon share one (Item Clause), honoring each set's preferences. */
export function buildTeam(ids: string[]): PokemonSet[] {
	const libs = ids.map(getLibrarySet);
	const used = new Set<string>();
	// Sets with fewer item options choose first.
	const order = libs.map((l, i) => i).sort((a, b) => libs[a].items.length - libs[b].items.length);
	const items: string[] = new Array(libs.length);
	for (const i of order) {
		const choice = libs[i].items.find(it => !used.has(it)) ?? fallbackItem(used);
		used.add(choice);
		items[i] = choice;
	}
	return libs.map((l, i) => materialize(l, items[i]));
}

const FALLBACK_ITEMS = ['Sitrus Berry', 'Leftovers', 'Lum Berry', 'Mental Herb', 'Shell Bell', 'Oran Berry', 'Quick Claw'];
function fallbackItem(used: Set<string>) {
	return FALLBACK_ITEMS.find(i => !used.has(i)) ?? '';
}

export function speciesKey(lib: LibrarySet) {
	return lib.set.species.split('-')[0] === 'Meowstic' ? 'Meowstic' : lib.set.species.replace(/-(Mega.*)$/, '');
}
