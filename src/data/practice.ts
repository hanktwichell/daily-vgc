// Practice battles: fixed matchups that live in the archive as P1, P2, ... outside the daily
// rotation, so adding one never moves a day's puzzle. Each has a themed opponent (exactly one
// Mega, like the daily ones) and a set team for the player. Set ids refer to sets-library.ts.
// Kept free of engine imports so the UI can use it cheaply.
import type { Archetype } from './daily';

export interface PracticeSet {
	id: string;
	name: string;
	trainer: string;
	/** Short flavor line shown at team preview. */
	quip: string;
	/** The opponent's six. */
	sets: string[];
	/** The player's six, and the plan they are built around. */
	playerIds: string[];
	archetype: Archetype;
}

export const PRACTICE_SETS: PracticeSet[] = [
	{
		id: 'fossil-dig', name: 'Fossil Dig', trainer: 'Fossil Maniac Rocky',
		quip: 'Sixty-five million years in the making. Mind the drill.',
		sets: ['excadrill-mega', 'aerodactyl', 'tyrantrum', 'rampardos', 'bastiodon', 'aurorus'],
		playerIds: ['pidgeot-mega', 'overqwil', 'corviknight', 'scrafty', 'hydreigon', 'polteageist'], archetype: 'tw',
	},
	{
		id: 'lucha-libre', name: 'Lucha Libre', trainer: 'Luchador Rey',
		quip: 'In this corner... all six of them.',
		sets: ['hawlucha-mega', 'incineroar', 'machamp', 'passimian', 'toxicroak', 'grapploct'],
		playerIds: ['ninetales', 'dragonite-mega', 'heliolisk', 'roserade', 'scrafty', 'manectric'], archetype: 'sun',
	},
	{
		id: 'first-partners', name: 'First Partners', trainer: 'Schoolkid Pat',
		quip: 'I couldn\'t pick just one, so I brought them all.',
		sets: ['charizard-mega-x', 'rillaboom', 'primarina', 'skeledirge', 'serperior', 'decidueye-hisui'],
		playerIds: ['trevenant', 'chandelure', 'indeedee-f', 'clawitzer', 'overqwil', 'aromatisse'], archetype: 'tr',
	},
	{
		id: 'mind-games', name: 'Mind Games', trainer: 'Hypnotist Morpheus',
		quip: 'You are getting very slow. Very, very slow.',
		sets: ['slowbro-mega', 'indeedee-f', 'armarouge', 'reuniclus', 'musharna', 'chandelure'],
		playerIds: ['politoed', 'clefable-mega', 'archaludon', 'castform', 'staraptor', 'meowstic-m'], archetype: 'rain',
	},
	{
		id: 'victory-road', name: 'Victory Road', trainer: 'Veteran Sterling',
		quip: 'No gimmicks. Just the best six I\'ve got.',
		sets: ['lucario-mega', 'sneasler', 'whimsicott', 'garchomp', 'gholdengo', 'kingambit'],
		playerIds: ['sandaconda', 'staraptor-mega', 'excadrill', 'luxray', 'froslass', 'espathra'], archetype: 'sand',
	},
];

/* Practice battles take the puzzle numbers below zero: P1 is -1, P2 is -2, and so on. That keeps
   their saved progress and results in the same storage as archive games, under their own keys. */

export const isPractice = (number: number) => number < 0;
export const practiceNumbers = () => PRACTICE_SETS.map((_, i) => -(i + 1));
export const practiceSet = (number: number): PracticeSet | undefined => (number < 0 ? PRACTICE_SETS[-number - 1] : undefined);
/** "#12" for a day's puzzle, "P2" for a practice battle. */
export const puzzleLabel = (number: number) => (number < 0 ? `P${-number}` : `#${number}`);
/** Stands in for the date when a practice battle is generated. */
export const practiceDate = (number: number) => `practice-${-number}`;
