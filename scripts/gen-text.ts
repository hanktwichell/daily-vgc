// Builds src/generated/battle-text.json (battle message templates + short descriptions)
// from Pokémon Showdown's data/text, for the protocol-to-text parser.
import fs from 'node:fs';
import { DefaultText } from '../vendor/ps/data/text/default';
import { MovesText } from '../vendor/ps/data/text/moves';
import { AbilitiesText } from '../vendor/ps/data/text/abilities';
import { ItemsText } from '../vendor/ps/data/text/items';
import * as Names from '../vendor/ps/data/text/names';

const strip = (table: Record<string, any>) => {
	const out: Record<string, any> = {};
	for (const [id, entry] of Object.entries(table)) {
		const e: Record<string, any> = {};
		for (const [k, v] of Object.entries(entry)) {
			if (k === 'desc' || /^gen\d$/.test(k)) continue;
			e[k] = v;
		}
		out[id] = e;
	}
	return out;
};

const text = {
	Default: DefaultText,
	Moves: strip(MovesText),
	Abilities: strip(AbilitiesText),
	Items: strip(ItemsText),
	StatNames: Names.StatNames, StatMediumNames: Names.StatMediumNames, StatShortNames: Names.StatShortNames,
	TypeNames: Names.TypeNames, StatusNames: Names.StatusNames, TargetNames: Names.TargetNames,
};
fs.mkdirSync('src/generated', { recursive: true });
fs.writeFileSync('src/generated/battle-text.json', JSON.stringify(text));
console.log('battle-text.json', (JSON.stringify(text).length / 1024).toFixed(0), 'KB');
