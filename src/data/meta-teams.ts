// Hard mode opponents: competitive teams built on the cores that are winning in
// Regulation M-C (Rillaboom, Sneasler, Incineroar, Mega Salamence, Kingambit, Gholdengo, ...).
// Each has one or two Mega Stones (the AI always brings one). Set ids refer to sets-library.ts.

export interface MetaTeam {
	id: string;
	name: string;
	trainer: string;
	quip: string;
	sets: string[];
}

export const META_TEAMS: MetaTeam[] = [
	{
		id: 'chomp-z-raichu', name: 'Garchomp-Z Goodstuffs', trainer: 'Ace Trainer Vega',
		quip: 'Two Megas, one plan: whatever beats you fastest.',
		sets: ['garchomp-mega-z', 'raichu-mega-y', 'incineroar', 'gholdengo', 'volcarona', 'rillaboom'],
	},
	{
		id: 'salamence-sand', name: 'Salamence Sand', trainer: 'Veteran Ingrid',
		quip: 'Sandstorm up, Tailwind up, game over.',
		sets: ['salamence-mega', 'tyranitar-mega', 'excadrill', 'corviknight', 'sneasler', 'indeedee-f'],
	},
	{
		id: 'blastoise-rillaboom', name: 'Blastoise Grassy', trainer: 'Ace Trainer Orson',
		quip: 'Grassy Glide first, questions later.',
		sets: ['blastoise-mega', 'rillaboom', 'indeedee-f', 'blaziken-mega', 'sneasler', 'kingambit'],
	},
	{
		id: 'zard-y-sun', name: 'Charizard-Y Sun', trainer: 'Veteran Soleil',
		quip: 'The forecast is sunny with a chance of Heat Wave.',
		sets: ['charizard-mega-y', 'kingambit', 'sneasler', 'incineroar', 'venusaur', 'whimsicott'],
	},
	{
		id: 'swampert-rain', name: 'Swampert Rain', trainer: 'Ace Trainer Marlow',
		quip: 'Bring an umbrella. It will not help.',
		sets: ['pelipper', 'swampert-mega', 'basculegion', 'archaludon', 'rillaboom', 'incineroar'],
	},
	{
		id: 'camerupt-tr', name: 'Camerupt Trick Room', trainer: 'Veteran Basalt',
		quip: 'Slow and steady wins the room.',
		sets: ['farigiraf', 'sinistcha', 'camerupt-mega', 'kingambit', 'incineroar', 'rillaboom'],
	},
	{
		id: 'dragonite-balance', name: 'Dragonite Balance', trainer: 'Ace Trainer Rhea',
		quip: 'No weaknesses. Well, fewer than yours.',
		sets: ['dragonite-mega', 'incineroar', 'rillaboom', 'gholdengo', 'sneasler', 'whimsicott'],
	},
	{
		id: 'salamence-tailwind', name: 'Salamence Tailwind', trainer: 'Veteran Gale',
		quip: 'Tailwind turn one. Every time.',
		sets: ['whimsicott', 'salamence-mega', 'kingambit', 'rillaboom', 'incineroar', 'garchomp'],
	},
	{
		id: 'tyranitar-sand', name: 'Tyranitar Sand', trainer: 'Ace Trainer Dune',
		quip: 'Sand Rush, Sand Force, sand everywhere.',
		sets: ['tyranitar-mega', 'excadrill', 'whimsicott', 'incineroar', 'gholdengo', 'kommo-o'],
	},
	{
		id: 'gengar-trap', name: 'Gengar Shadow Tag', trainer: 'Veteran Morrigan',
		quip: 'You can check out any time you like...',
		sets: ['gengar-mega', 'incineroar', 'rillaboom', 'kingambit', 'talonflame', 'gholdengo'],
	},
	{
		id: 'lucario-z', name: 'Lucario-Z Offense', trainer: 'Ace Trainer Riven',
		quip: 'Aura Sphere never misses. Neither do I.',
		sets: ['lucario-mega-z', 'indeedee-f', 'whimsicott', 'incineroar', 'garchomp', 'archaludon'],
	},
	{
		id: 'floette-fairy', name: 'Floette Fairy Aura', trainer: 'Veteran Fleur',
		quip: 'Light of Ruin, with extra ruin.',
		sets: ['floette-mega', 'incineroar', 'rillaboom', 'garchomp', 'sneasler', 'gholdengo'],
	},
	{
		id: 'kangaskhan-fakeout', name: 'Kangaskhan Pressure', trainer: 'Ace Trainer Maren',
		quip: 'Fake Out, Fake Out, Fake Out.',
		sets: ['kangaskhan-mega', 'whimsicott', 'sneasler', 'garchomp', 'rotom-wash', 'kingambit'],
	},
	{
		id: 'gardevoir-pixilate', name: 'Gardevoir Hyper Voice', trainer: 'Veteran Celeste',
		quip: 'Pixilate Hyper Voice hits everything. Including your hopes.',
		sets: ['gardevoir-mega', 'incineroar', 'rillaboom', 'kingambit', 'talonflame', 'archaludon'],
	},
	{
		id: 'hatterene-tr', name: 'Hatterene Room', trainer: 'Ace Trainer Wren',
		quip: 'Expanding Force under Trick Room. Brace yourself.',
		sets: ['hatterene', 'indeedee-f', 'camerupt-mega', 'kingambit', 'incineroar', 'sinistcha'],
	},
	{
		id: 'basculegion-rain', name: 'Basculegion Rain', trainer: 'Veteran Torrent',
		quip: 'Last Respects gets stronger with every faint. Choose wisely.',
		sets: ['pelipper', 'basculegion', 'archaludon', 'greninja-mega', 'incineroar', 'rillaboom'],
	},
	{
		id: 'psyspam', name: 'Psyspam', trainer: 'Ace Trainer Sibyl',
		quip: 'Psychic Terrain is up. Expanding Force is coming for both of you.',
		sets: ['hatterene', 'indeedee-f', 'armarouge', 'gardevoir-mega', 'kommo-o', 'kingambit'],
	},
];
