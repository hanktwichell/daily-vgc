// Local persistence: lifetime stats and today's in-progress battle, kept separately for
// the daily battle and for hard mode.

export type Mode = 'normal' | 'hard';

export interface GameRecord {
	number: number;
	won: boolean;
	/** Survival of the player's four, in the order they were chosen. */
	alive: boolean[];
	turns: number;
}

export interface Stats {
	played: number;
	won: number;
	streak: number;
	maxStreak: number;
	lastNumber: number;
	history: Record<number, GameRecord>;
}

export interface Progress {
	number: number;
	date: string;
	phase: 'battle' | 'done';
	order: number[];
	battle?: string;
	/** Protocol lines seen so far (for rebuilding the scene on reload). */
	lines: string[];
	result?: GameRecord;
}

const key = (base: string, mode: Mode) => (mode === 'hard' ? `${base}-hard` : base);
const STATS_KEY = 'dailyvgc:stats';
const PROGRESS_KEY = 'dailyvgc:progress';

function read<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) as T : null;
	} catch {
		return null;
	}
}

function write(key: string, value: unknown) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Storage full or unavailable (private mode): the game still works for this session.
	}
}

export function loadStats(mode: Mode = 'normal'): Stats {
	return read<Stats>(key(STATS_KEY, mode)) ?? { played: 0, won: 0, streak: 0, maxStreak: 0, lastNumber: 0, history: {} };
}

/** A streak survives only if yesterday's puzzle was won. */
export function currentStreak(stats: Stats, todayNumber: number): number {
	// Puzzle numbers start at #0, so check the history rather than lastNumber's truthiness.
	const last = stats.history[stats.lastNumber];
	if (!last?.won) return 0;
	return stats.lastNumber >= todayNumber - 1 ? stats.streak : 0;
}

export function recordResult(record: GameRecord, mode: Mode = 'normal'): Stats {
	const stats = loadStats(mode);
	if (stats.history[record.number]) return stats;
	const continues = stats.lastNumber === record.number - 1 && stats.history[stats.lastNumber]?.won;
	stats.played++;
	if (record.won) {
		stats.won++;
		stats.streak = continues ? stats.streak + 1 : 1;
		stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
	} else {
		stats.streak = 0;
	}
	stats.lastNumber = record.number;
	stats.history[record.number] = record;
	write(key(STATS_KEY, mode), stats);
	return stats;
}

const archiveKey = (number: number, mode: Mode) => `dailyvgc:archive-progress:${number}${mode === 'hard' ? '-hard' : ''}`;

/** Saved progress for a puzzle: today's battle, or a past one played from the archive. */
export function loadProgress(number: number, mode: Mode = 'normal', archive = false): Progress | null {
	const p = read<Progress>(archive ? archiveKey(number, mode) : key(PROGRESS_KEY, mode));
	return p && p.number === number ? p : null;
}

export function saveProgress(p: Progress, mode: Mode = 'normal', archive = false) {
	write(archive ? archiveKey(p.number, mode) : key(PROGRESS_KEY, mode), p);
}

export function clearArchiveProgress(number: number, mode: Mode) {
	try { localStorage.removeItem(archiveKey(number, mode)); } catch { /* ignore */ }
}

/* Archive results: kept apart from the main stats. A win is never overwritten by a later loss. */
const ARCHIVE_RESULTS_KEY = 'dailyvgc:archive';
export type ArchiveResults = Record<string, GameRecord>;
const resultKey = (number: number, mode: Mode) => `${number}${mode === 'hard' ? '-hard' : ''}`;

export function loadArchiveResults(): ArchiveResults {
	return read<ArchiveResults>(ARCHIVE_RESULTS_KEY) ?? {};
}

export function archiveResult(results: ArchiveResults, number: number, mode: Mode): GameRecord | undefined {
	return results[resultKey(number, mode)];
}

export function recordArchiveResult(record: GameRecord, mode: Mode) {
	const results = loadArchiveResults();
	const k = resultKey(record.number, mode);
	if (!results[k]?.won || record.won) results[k] = record;
	write(ARCHIVE_RESULTS_KEY, results);
}

/** Hard mode for a puzzle unlocks once its daily battle is won, on the day or in the archive. */
export function dailyWon(number: number): boolean {
	return !!loadStats('normal').history[number]?.won || !!archiveResult(loadArchiveResults(), number, 'normal')?.won;
}

const SETTINGS_KEY = 'dailyvgc:settings';
export interface Settings { speed: 'normal' | 'fast'; seenHelp: boolean }
export function loadSettings(): Settings {
	return { speed: 'normal', seenHelp: false, ...(read<Settings>(SETTINGS_KEY) ?? {}) };
}
export function saveSettings(s: Settings) {
	write(SETTINGS_KEY, s);
}
