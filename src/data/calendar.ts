// Puzzle calendar: a new puzzle every midnight in New York (Eastern Time).
// Kept free of engine imports so the UI can use it cheaply.

/** Puzzle #1 is this date (America/New_York). */
export const LAUNCH_DATE = '2026-10-12';
export const PUZZLE_TIME_ZONE = 'America/New_York';

/** YYYY-MM-DD of the puzzle day for an instant (new puzzle at midnight Eastern). */
export function puzzleDateFor(now: Date = new Date()): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: PUZZLE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
	}).formatToParts(now);
	const get = (t: string) => parts.find(p => p.type === t)!.value;
	return `${get('year')}-${get('month')}-${get('day')}`;
}

function dayIndex(date: string) {
	const [y, m, d] = date.split('-').map(Number);
	return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function puzzleNumberFor(date: string) {
	return dayIndex(date) - dayIndex(LAUNCH_DATE) + 1;
}

export function dateForPuzzleNumber(n: number) {
	const ms = (dayIndex(LAUNCH_DATE) + n - 1) * 86400000;
	return new Date(ms).toISOString().slice(0, 10);
}

/** Milliseconds until the next puzzle unlocks. */
export function msUntilNextPuzzle(now: Date = new Date()) {
	const today = puzzleDateFor(now);
	// Step forward in 1-minute increments from a coarse guess; DST-safe and cheap.
	let t = now.getTime() + 60_000;
	let step = 3_600_000;
	while (step >= 1000) {
		while (puzzleDateFor(new Date(t + step)) === today) t += step;
		step = Math.floor(step / 4);
	}
	while (puzzleDateFor(new Date(t)) === today) t += 1000;
	return t - now.getTime();
}

