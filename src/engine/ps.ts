// Registers Showdown's data tables statically, then re-exports the simulator.
// Learnsets are left out of the browser bundle; Node scripts add them (see ps-node.ts).
import { registerPSData } from '../../vendor/ps/sim/registry';
import { Abilities } from '../../vendor/ps/data/abilities';
import { Aliases, CompoundWordNames } from '../../vendor/ps/data/aliases';
import { Conditions } from '../../vendor/ps/data/conditions';
import { FormatsData } from '../../vendor/ps/data/formats-data';
import { Items } from '../../vendor/ps/data/items';
import { Moves } from '../../vendor/ps/data/moves';
import { Natures } from '../../vendor/ps/data/natures';
import { Pokedex } from '../../vendor/ps/data/pokedex';
import { Rulesets } from '../../vendor/ps/data/rulesets';
import { Scripts } from '../../vendor/ps/data/scripts';
import { TypeChart } from '../../vendor/ps/data/typechart';
import { Abilities as ChAbilities } from '../../vendor/ps/data/mods/champions/abilities';
import { Conditions as ChConditions } from '../../vendor/ps/data/mods/champions/conditions';
import { FormatsData as ChFormatsData } from '../../vendor/ps/data/mods/champions/formats-data';
import { Items as ChItems } from '../../vendor/ps/data/mods/champions/items';
import { Moves as ChMoves } from '../../vendor/ps/data/mods/champions/moves';
import { Rulesets as ChRulesets } from '../../vendor/ps/data/mods/champions/rulesets';
import { Scripts as ChScripts } from '../../vendor/ps/data/mods/champions/scripts';
import { Formats } from '../../vendor/ps/config/formats';

registerPSData({
	base: {
		Abilities, Conditions, FormatsData, Items, Moves, Natures, Pokedex, Rulesets, Scripts, TypeChart,
		Learnsets: {}, PokemonGoData: {},
	},
	mods: {
		champions: {
			Abilities: ChAbilities, Conditions: ChConditions, FormatsData: ChFormatsData, Items: ChItems,
			Moves: ChMoves, Rulesets: ChRulesets, Scripts: ChScripts,
		},
	},
	aliases: { Aliases, CompoundWordNames },
	formats: Formats as any[],
});

export { Dex, toID } from '../../vendor/ps/sim/dex';
export { Battle } from '../../vendor/ps/sim/battle';
export { State } from '../../vendor/ps/sim/state';
export { PRNG } from '../../vendor/ps/sim/prng';
export { Teams } from '../../vendor/ps/sim/teams';
export type { PokemonSet } from '../../vendor/ps/sim/teams';

export const FORMAT_ID = 'gen9championsvgc2026regmc';
