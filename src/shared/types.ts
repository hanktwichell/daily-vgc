// Messages and data shapes shared between the UI (main thread) and the battle worker.

export type StatID = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type Stats = Record<StatID, number>;

export interface MoveView {
	id: string;
	name: string;
	type: string;
	category: 'Physical' | 'Special' | 'Status';
	basePower: number;
	accuracy: number | true;
	pp: number;
	priority: number;
	target: string;
	/** Secondary effects and other notable properties, as short sentences. */
	effects: string[];
	/** Move flags that matter for abilities and items (Contact, Sound, Punch, ...). */
	tags: string[];
}

/** How effective a damaging move is on one Pokémon: mult 0 is immune. */
export interface TargetHint { mult: number; note?: string }
/** hints[activeSlot][moveIndex][targetLoc]; target locs are 1/2 for foes and -1/-2 for your side. */
export type MoveHints = Record<number, Record<number, TargetHint>[]>;

export interface MonView {
	species: string;
	speciesId: string;
	types: string[];
	item: string;
	itemId: string;
	ability: string;
	abilityId: string;
	nature: string;
	gender: string;
	sp: Stats;
	stats: Stats;
	moves: MoveView[];
	mega?: { species: string; speciesId: string; types: string[]; ability: string; abilityId: string; stats: Stats };
}

export type Mode = 'normal' | 'hard';

export interface PuzzleView {
	mode: Mode;
	number: number;
	date: string;
	/** Short description of the player's team (game plan, or whose team it is in hard mode). */
	archetype: string;
	opponent: { id: string; name: string; trainer: string; quip: string };
	player: MonView[];
	foe: MonView[];
}

export type ToWorker =
	| { type: 'init'; date: string; mode: Mode }
	| { type: 'start'; order: number[] }
	| { type: 'choose'; choice: string }
	| { type: 'resume'; date: string; mode: Mode; battle: string };

export type FromWorker =
	| { type: 'puzzle'; puzzle: PuzzleView }
	| { type: 'update'; lines: string[]; request: any | null; battle: string; ended: boolean; winner?: string; turn: number;
		/** Which of the player's four (in their chosen order) are still standing. */
		alive: boolean[] }
	| { type: 'thinking'; thinking: boolean }
	| { type: 'error'; message: string };
