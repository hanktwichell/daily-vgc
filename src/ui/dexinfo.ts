import TEXT from '../generated/battle-text.json';
import SPRITES from '../generated/sprites.json';

const text = TEXT as any;
const sprites = SPRITES as Record<string, { front: string; back: string }>;

export function moveDesc(id: string): string { return text.Moves[id]?.shortDesc || ''; }
export function itemDesc(id: string): string { return text.Items[id]?.shortDesc || ''; }
export function abilityDesc(id: string): string { return text.Abilities[id]?.shortDesc || ''; }

const BASE = import.meta.env.BASE_URL;

export function spriteUrl(speciesId: string, back = false): string {
	let entry = sprites[speciesId];
	if (!entry) {
		// Fall back to the base species (e.g. an unlisted forme).
		const base = Object.keys(sprites).filter(k => speciesId.startsWith(k)).sort((a, b) => b.length - a.length)[0];
		entry = sprites[base];
	}
	if (!entry) return '';
	return BASE + (back ? entry.back : entry.front);
}


export const TYPE_COLORS: Record<string, string> = {
	Normal: '#a8a878', Fire: '#f08030', Water: '#6890f0', Electric: '#f8d030', Grass: '#78c850', Ice: '#98d8d8',
	Fighting: '#c03028', Poison: '#a040a0', Ground: '#e0c068', Flying: '#a890f0', Psychic: '#f85888', Bug: '#a8b820',
	Rock: '#b8a038', Ghost: '#705898', Dragon: '#7038f8', Dark: '#705848', Steel: '#b8b8d0', Fairy: '#ee99ac',
	Stellar: '#40b5a5', '???': '#68a090',
};

export const STAT_NAMES: Record<string, string> = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

export const STATUS_LABEL: Record<string, string> = { brn: 'BRN', par: 'PAR', slp: 'SLP', frz: 'FRZ', psn: 'PSN', tox: 'PSN' };
