// Curated opponent teams. Each has exactly one Mega Evolution (always brought to battle),
// a clear game plan, and a bit of personality. Set ids refer to sets-library.ts.

export interface OpponentTeam {
	id: string;
	name: string;
	trainer: string;
	/** Short flavor line shown at team preview. */
	quip: string;
	sets: string[];
}

export const OPPONENT_TEAMS: OpponentTeam[] = [
	{
		id: 'haunted-mansion', name: 'Haunted Mansion', trainer: 'Hex Maniac Wendy',
		quip: 'The lights flicker... the room twists...',
		sets: ['gourgeist-super', 'chandelure-mega', 'houndstone', 'sableye', 'mimikyu', 'kingambit'],
	},
	{
		id: 'sweet-shop', name: 'Sweet Shop', trainer: 'Pâtissière Coco',
		quip: 'Fresh out of the oven and very, very sticky.',
		sets: ['whimsicott', 'alcremie', 'meganium-mega', 'appletun', 'slurpuff', 'tinkaton'],
	},
	{
		id: 'pirate-crew', name: 'Pirate Crew', trainer: 'Sailor Barnacle Bill',
		quip: 'Yo ho! Batten down the hatches, a storm rolls in!',
		sets: ['pelipper', 'sharpedo-mega', 'samurott-hisui', 'squawkabilly', 'golisopod', 'kingambit'],
	},
	{
		id: 'spicy-kitchen', name: 'Spicy Kitchen', trainer: 'Chef Paprika',
		quip: 'Turn up the heat. Do not forget the salt.',
		sets: ['ninetales', 'scovillain-mega', 'venusaur', 'tauros-paldea-blaze', 'salazzle', 'garganacl'],
	},
	{
		id: 'aura-dojo', name: 'Aura Dojo', trainer: 'Black Belt Kiyo',
		quip: 'Feel the aura. Then feel the fist.',
		sets: ['lucario-mega-z', 'scrafty', 'annihilape', 'sirfetchd', 'talonflame', 'rotom-wash'],
	},
	{
		id: 'sandcastle', name: 'Sandcastle Builders', trainer: 'Ruin Maniac Dusty',
		quip: 'Every grain of sand is a brick in my fortress.',
		sets: ['hippowdon', 'garchomp-mega', 'excadrill', 'sandaconda', 'corviknight', 'sylveon'],
	},
	{
		id: 'snow-day', name: 'Snow Day', trainer: 'Skier Flurry',
		quip: 'School is cancelled. Battling is not.',
		sets: ['ninetales-alola', 'baxcalibur-mega', 'beartic', 'froslass', 'rotom-heat', 'scizor'],
	},
	{
		id: 'ill-omens', name: 'Ill Omens', trainer: 'Psychic Raven',
		quip: 'Absol appeared. You know what that means.',
		sets: ['pelipper', 'absol-mega-z', 'castform', 'archaludon', 'gholdengo', 'incineroar'],
	},
	{
		id: 'sky-racers', name: 'Sky Racers', trainer: 'Bird Keeper Jett',
		quip: 'Catch me if you can. Spoiler: you can not.',
		sets: ['talonflame', 'garchomp-mega-z', 'dragapult', 'arcanine', 'rotom-wash', 'tinkaton'],
	},
	{
		id: 'royal-court', name: 'Royal Court', trainer: 'Lady Marguerite',
		quip: 'Kneel before the court. Priority moves are not permitted here.',
		sets: ['indeedee-f', 'gallade-mega', 'tsareena', 'kingambit', 'hatterene', 'arcanine-hisui'],
	},
	{
		id: 'big-top', name: 'The Big Top', trainer: 'Ringmaster Ruffles',
		quip: 'Ladies and gentlemen, the main event!',
		sets: ['grimmsnarl', 'kangaskhan-mega', 'toxtricity', 'maushold', 'arcanine', 'rotom-frost'],
	},
	{
		id: 'old-folks', name: 'Slow and Steady', trainer: 'Gentleman Alistair',
		quip: 'In my day we took our turns slowly. Still do.',
		sets: ['farigiraf', 'camerupt-mega', 'torkoal', 'snorlax', 'conkeldurr', 'hippowdon'],
	},
	{
		id: 'disco-fever', name: 'Disco Fever', trainer: 'Dancer Groovy',
		quip: 'Strike a pose! The floor is lava, and also electric.',
		sets: ['pawmot', 'raichu-mega-y', 'quaquaval', 'volcarona', 'oranguru', 'scizor'],
	},
	{
		id: 'rainy-day-band', name: 'Rainy Day Band', trainer: 'Musician Melody',
		quip: 'Every rain cloud has a backing track.',
		sets: ['politoed', 'primarina', 'blastoise-mega', 'toxtricity', 'kommo-o', 'whimsicott'],
	},
	{
		id: 'tiny-terrors', name: 'Tiny Terrors', trainer: 'Preschooler Pip',
		quip: 'They are small. They are cute. They are angry.',
		sets: ['pikachu', 'mawile-mega', 'klefki', 'dedenne', 'maushold', 'morpeko'],
	},
	{
		id: 'dragon-hoard', name: "Dragon's Hoard", trainer: 'Dragon Tamer Ignatius',
		quip: 'Guarded by fire, gold, and scales.',
		sets: ['dragonite-mega', 'gholdengo', 'incineroar', 'hydreigon', 'whimsicott', 'kommo-o'],
	},
	{
		id: 'bug-catcher', name: 'Bug Catcher Supreme', trainer: 'Bug Catcher Rick',
		quip: 'I caught them all in Viridian Forest. Every single one.',
		sets: ['vivillon', 'scizor-mega', 'volcarona', 'araquanid', 'kleavor', 'golisopod'],
	},
	{
		id: 'space-cadets', name: 'Space Cadets', trainer: 'Scientist Nova',
		quip: 'Initiating psychic launch sequence in 3... 2...',
		sets: ['indeedee-f', 'metagross-mega', 'espathra', 'armarouge', 'reuniclus', 'gholdengo'],
	},
	{
		id: 'garden-party', name: 'Garden Party', trainer: 'Gardener Rosa',
		quip: 'Tea is served on the lawn. Mind the thorns.',
		sets: ['sinistcha', 'floette-mega', 'roserade', 'gogoat', 'torkoal', 'tinkaton'],
	},
	{
		id: 'construction', name: 'Construction Crew', trainer: 'Worker Hardhat Hank',
		quip: 'Hard hats on. We are breaking ground today.',
		sets: ['farigiraf', 'aggron-mega', 'conkeldurr', 'rhyperior', 'orthworm', 'rotom-heat'],
	},
	{
		id: 'night-shift', name: 'Night Shift', trainer: 'Punk Girl Vex',
		quip: 'Lights out. Nobody sees us coming.',
		sets: ['weavile', 'houndoom-mega', 'umbreon', 'krookodile', 'thievul', 'rotom-wash'],
	},
	{
		id: 'flying-circus', name: 'Flying Circus', trainer: 'Acrobat Skye',
		quip: 'Up, up and away! Mind the propellers.',
		sets: ['corviknight', 'pidgeot-mega', 'staraptor', 'noivern', 'rotom-heat', 'kingambit'],
	},
	{
		id: 'deep-sea', name: 'Deep Sea Expedition', trainer: 'Diver Marina',
		quip: 'Twenty thousand leagues of bad news.',
		sets: ['pelipper', 'greninja-mega', 'basculegion', 'milotic', 'overqwil', 'clawitzer'],
	},
	{
		id: 'tailwind-express', name: 'Tailwind Express', trainer: 'Conductor Gale',
		quip: 'All aboard! Next stop: your faint screen.',
		sets: ['whimsicott', 'salamence-mega', 'krookodile', 'rotom-wash', 'kingambit', 'arcanine'],
	},
	{
		id: 'volcano-lab', name: 'Volcano Lab', trainer: 'Burglar Magma',
		quip: 'The eruption is scheduled for turn one.',
		sets: ['hatterene', 'typhlosion-hisui', 'camerupt-mega', 'torkoal', 'garganacl', 'incineroar'],
	},
	{
		id: 'storm-chasers', name: 'Storm Chasers', trainer: 'Ace Trainer Tempest',
		quip: 'The forecast calls for thunder. Lots of it.',
		sets: ['pelipper', 'ampharos-mega', 'archaludon', 'basculegion', 'rotom-wash', 'whimsicott'],
	},
	{
		id: 'kaiju-attack', name: 'Kaiju Attack', trainer: 'Director Ishiro',
		quip: 'Evacuate the city. They are slow, but they are huge.',
		sets: ['hatterene', 'tyranitar-mega', 'rhyperior', 'avalugg-hisui', 'snorlax', 'gourgeist-super'],
	},
	{
		id: 'shell-game', name: 'Shell Game', trainer: 'Hustler Shelly',
		quip: 'Keep your eye on the shell. No, the other shell.',
		sets: ['clefable', 'barbaracle-mega', 'polteageist', 'golisopod', 'garganacl', 'araquanid'],
	},
	{
		id: 'chill-cafe', name: 'Chill Café', trainer: 'Barista Frost',
		quip: 'One iced latte and one devastating blizzard, coming up.',
		sets: ['abomasnow-mega', 'farigiraf', 'mamoswine', 'vanilluxe', 'rotom-heat', 'conkeldurr'],
	},
	{
		id: 'treasure-hunt', name: 'Treasure Hunt', trainer: 'Ruin Maniac Indy',
		quip: 'I found these in an ancient ruin. Do not tell anyone.',
		sets: ['aerodactyl-mega', 'garganacl', 'excadrill', 'gholdengo', 'whimsicott', 'rotom-mow'],
	},
	{
		id: 'beast-mode', name: 'Beast Mode', trainer: 'Bodybuilder Brutus',
		quip: 'Skip leg day? Never. Skip Protect? Always.',
		sets: ['crabominable-mega', 'machamp', 'mudsdale', 'oranguru', 'snorlax', 'hippowdon'],
	},
	{
		id: 'pop-idols', name: 'Pop Idols', trainer: 'Idol Starla',
		quip: 'Clap along! Your team will not stop the music.',
		sets: ['gardevoir-mega', 'primarina', 'meowstic-m', 'toxtricity', 'incineroar', 'kingambit'],
	},
	{
		id: 'magic-show', name: 'Magic Show', trainer: 'Magician Prestige',
		quip: 'For my next trick, your Pokémon will disappear.',
		sets: ['alakazam-mega', 'grimmsnarl', 'zoroark-hisui', 'mr-rime', 'gholdengo', 'arcanine'],
	},
	{
		id: 'lightning-rodeo', name: 'Lightning Rodeo', trainer: 'Cowboy Volt',
		quip: 'Yee-haw! Grab the reins and hold on tight!',
		sets: ['manectric-mega', 'tauros-paldea-aqua', 'mudsdale', 'whimsicott', 'gogoat', 'scizor'],
	},
	{
		id: 'samurai-code', name: 'Samurai Code', trainer: 'Swordsman Takeda',
		quip: 'The blade is drawn. There is no sheathing it now.',
		sets: ['gallade-mega', 'samurott-hisui', 'kleavor', 'aegislash', 'ceruledge', 'indeedee-f'],
	},
	{
		id: 'apple-orchard', name: 'Apple Orchard', trainer: 'Farmer Pippin',
		quip: 'An apple a day keeps the challengers away.',
		sets: ['hydrapple', 'flapple', 'venusaur-mega', 'farigiraf', 'incineroar', 'tinkaton'],
	},
	{
		id: 'monster-truck', name: 'Monster Truck Rally', trainer: 'Biker Diesel',
		quip: 'Vroom vroom. Crush the competition.',
		sets: ['steelix-mega', 'cofagrigus', 'mudsdale', 'conkeldurr', 'torkoal', 'sinistcha'],
	},
	{
		id: 'witching-hour', name: 'Witching Hour', trainer: 'Witch Hazel',
		quip: 'Double, double, toil and trouble.',
		sets: ['froslass-mega', 'hatterene', 'grimmsnarl', 'mimikyu', 'sinistcha', 'ninetales'],
	},
	{
		id: 'speedy-delivery', name: 'Speedy Delivery', trainer: 'Courier Dash',
		quip: 'Express shipping. Fragile contents: your hopes.',
		sets: ['lopunny-mega', 'talonflame', 'meowscarada', 'lycanroc-dusk', 'rotom-wash', 'garchomp'],
	},
	{
		id: 'zen-garden', name: 'Zen Garden', trainer: 'Monk Haru',
		quip: 'Breathe in. Breathe out. Then Close Combat.',
		sets: ['medicham-mega', 'indeedee-f', 'hatterene', 'torkoal', 'conkeldurr', 'gogoat'],
	},
	{
		id: 'eel-power', name: 'Electric Eel-ectric', trainer: 'Fisherman Sparky',
		quip: 'I was trying to catch a Magikarp. I caught this instead.',
		sets: ['eelektross-mega', 'pelipper', 'basculegion', 'rotom-heat', 'tinkaton', 'farigiraf'],
	},
];
