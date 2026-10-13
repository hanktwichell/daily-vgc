// Community stats: what the site reports for each finished battle, and the daily summary the
// recorder (recorder/, a Cloudflare Worker) serves back. Shared by both, so keep it dependency-free.

export type CommunityMode = 'normal' | 'hard';
export const COMMUNITY_MODES: CommunityMode[] = ['normal', 'hard'];

/** One finished battle, played on its own day: a browser's first try at it, or a replay. */
export interface BattleSubmission {
	/** Anonymous random id, one per browser: lets the recorder ignore duplicates. */
	cid: string;
	puzzle: number;
	mode: CommunityMode;
	won: boolean;
	/** How many of the four were still standing at the end (0 on a loss). */
	alive: number;
	turns: number;
	/** The four brought, as indices into `team`, in the order picked. */
	picks: number[];
	/** The player's six, by species name, in puzzle order. */
	team: string[];
	/** Site build that sent it. */
	v?: string;
	/** Not this browser's first try at the battle. Replays count toward the stats, but not as players. */
	replay?: boolean;
}

export interface ModeStats {
	/** Battles, replays included. */
	played: number;
	won: number;
	/** Battles per result bar: Perfect, 3/4, 2/4, 1/4, Loss. */
	results: number[];
	/** The player's six for that puzzle. */
	team: string[];
	/** How many battles brought each of the six. */
	picks: number[];
	/** The four (team indices, sorted) with the best win rate, once any four has enough games. */
	best: { picks: number[]; played: number; won: number } | null;
}

export interface CommunityStats {
	puzzle: number;
	date: string;
	/** False while late results (battles that ran past midnight) can still arrive. */
	final: boolean;
	modes: Partial<Record<CommunityMode, ModeStats>>;
}

/** How many players have finished a battle on the current puzzle so far. */
export interface PlayerCount {
	puzzle: number;
	players: number;
}

const NAME = /^[\p{L}\p{N} .:'’%-]{1,40}$/u;

/** Checks a submission's shape; returns the cleaned submission or the reason it was rejected. */
export function validateSubmission(x: any): BattleSubmission | string {
	if (!x || typeof x !== 'object') return 'not an object';
	if (typeof x.cid !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(x.cid)) return 'bad cid';
	if (!Number.isInteger(x.puzzle) || x.puzzle < 0) return 'bad puzzle';
	if (x.mode !== 'normal' && x.mode !== 'hard') return 'bad mode';
	if (typeof x.won !== 'boolean') return 'bad won';
	if (!Number.isInteger(x.alive) || x.alive < 0 || x.alive > 4) return 'bad alive';
	if (x.won ? x.alive < 1 : x.alive !== 0) return 'alive does not match the result';
	if (!Number.isInteger(x.turns) || x.turns < 1 || x.turns > 500) return 'bad turns';
	if (!Array.isArray(x.picks) || x.picks.length !== 4 || new Set(x.picks).size !== 4 ||
		!x.picks.every((p: unknown) => Number.isInteger(p) && (p as number) >= 0 && (p as number) < 6)) return 'bad picks';
	if (!Array.isArray(x.team) || x.team.length !== 6 || new Set(x.team).size !== 6 ||
		!x.team.every((t: unknown) => typeof t === 'string' && NAME.test(t))) return 'bad team';
	if (x.replay !== undefined && typeof x.replay !== 'boolean') return 'bad replay';
	const v = typeof x.v === 'string' ? x.v.slice(0, 40) : undefined;
	return {
		cid: x.cid, puzzle: x.puzzle, mode: x.mode, won: x.won, alive: x.alive, turns: x.turns, picks: x.picks, team: x.team, v,
		...(x.replay ? { replay: true } : {}),
	};
}

/** A stored battle, as the recorder keeps it. */
export interface StoredBattle {
	won: number | boolean;
	alive: number;
	/** Comma-separated team indices in pick order. */
	picks: string;
	/** JSON array of the six names. */
	team: string;
}

/** Win-rate estimate that doesn't let a 1-for-1 four beat a 40-for-50 one. */
const smoothed = (won: number, played: number) => (won + 1) / (played + 2);

/**
 * Summarises one puzzle's battles in one mode. Only battles reporting the most common team
 * count, so stray or forged submissions for the wrong team are ignored.
 */
export function aggregate(rows: StoredBattle[]): ModeStats | null {
	if (!rows.length) return null;
	const teams = new Map<string, number>();
	for (const r of rows) teams.set(r.team, (teams.get(r.team) ?? 0) + 1);
	const teamKey = [...teams].sort((a, b) => b[1] - a[1])[0][0];
	const team = JSON.parse(teamKey) as string[];

	const stats: ModeStats = { played: 0, won: 0, results: [0, 0, 0, 0, 0], team, picks: [0, 0, 0, 0, 0, 0], best: null };
	const fours = new Map<string, { played: number; won: number }>();
	for (const r of rows) {
		if (r.team !== teamKey) continue;
		const won = !!r.won;
		const picks = r.picks.split(',').map(Number);
		stats.played++;
		if (won) stats.won++;
		stats.results[won ? 4 - Math.min(4, Math.max(1, r.alive)) : 4]++;
		for (const p of picks) stats.picks[p]++;
		const key = [...picks].sort((a, b) => a - b).join(',');
		const f = fours.get(key) ?? { played: 0, won: 0 };
		f.played++;
		if (won) f.won++;
		fours.set(key, f);
	}
	// A four needs a few games (and at least 2% of all battles) before it can be the standout.
	const minGames = Math.max(3, Math.ceil(stats.played * 0.02));
	let best: ModeStats['best'] = null;
	for (const [key, f] of fours) {
		if (f.played < minGames || f.won === 0) continue;
		if (!best || smoothed(f.won, f.played) > smoothed(best.won, best.played) ||
			(smoothed(f.won, f.played) === smoothed(best.won, best.played) && f.played > best.played)) {
			best = { picks: key.split(',').map(Number), played: f.played, won: f.won };
		}
	}
	stats.best = best;
	return stats;
}
