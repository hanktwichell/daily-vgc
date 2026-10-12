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
}

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

export interface PuzzleView {
	number: number;
	date: string;
	archetype: string;
	opponent: { id: string; name: string; trainer: string; quip: string };
	player: MonView[];
	foe: MonView[];
}

export type ToWorker =
	| { type: 'init'; date: string }
	| { type: 'start'; order: number[] }
	| { type: 'choose'; choice: string }
	| { type: 'resume'; date: string; battle: string };

export type FromWorker =
	| { type: 'puzzle'; puzzle: PuzzleView }
	| { type: 'update'; lines: string[]; request: any | null; battle: string; ended: boolean; winner?: string; turn: number;
		/** Which of the player's four (in their chosen order) are still standing. */
		alive: boolean[] }
	| { type: 'thinking'; thinking: boolean }
	| { type: 'error'; message: string };
