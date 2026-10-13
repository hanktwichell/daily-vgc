// Talks to the recorder (recorder/): reports each finished day-of battle and fetches the
// community summary of finished puzzles and today's player count. Disabled when no recorder
// URL is configured.
import type { BattleSubmission, CommunityStats, PlayerCount } from '../shared/community';

const API = ((import.meta.env.VITE_RECORDER_URL as string | undefined) || '').replace(/\/$/, '');
const VERSION = (import.meta.env.VITE_COMMIT as string | undefined)?.slice(0, 12) || 'dev';
const CID_KEY = 'dailyvgc:cid';

export const recorderEnabled = () => !!API;

/** Anonymous random id for this browser, so a result is only counted once. */
function clientId(): string {
	try {
		let id = localStorage.getItem(CID_KEY);
		if (!id) {
			id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
			localStorage.setItem(CID_KEY, id);
		}
		return id;
	} catch {
		return `anon-${Math.random().toString(36).slice(2, 14)}`;
	}
}

/**
 * Fire-and-forget: a failed report never affects the game. The promise settles once the
 * recorder has answered (or the report failed) and never rejects.
 */
export function submitResult(result: Omit<BattleSubmission, 'cid' | 'v'>): Promise<void> {
	if (!API) return Promise.resolve();
	try {
		const body: BattleSubmission = { ...result, cid: clientId(), v: VERSION };
		// text/plain keeps this a "simple" request (no CORS preflight), which keepalive needs.
		return fetch(`${API}/result`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body), keepalive: true })
			.then(() => {}, () => {});
	} catch {
		return Promise.resolve();
	}
}

const cache = new Map<number, Promise<CommunityStats | null>>();

/** Summary of a finished puzzle, or null if there isn't one (yet). */
export function fetchCommunityStats(puzzle: number): Promise<CommunityStats | null> {
	if (!API || puzzle < 0) return Promise.resolve(null);
	if (!cache.has(puzzle)) {
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), 6000);
		cache.set(puzzle, fetch(`${API}/stats/${puzzle}`, { signal: ctrl.signal })
			.then(r => (r.ok ? r.json() as Promise<CommunityStats> : null))
			.catch(() => null)
			.finally(() => clearTimeout(timer)));
	}
	return cache.get(puzzle)!;
}

/**
 * How many players have finished today's puzzle so far, or null if that isn't known.
 * `fresh` skips the browser's cached answer, for right after this browser's own result.
 */
export function fetchPlayerCount(puzzle: number, fresh = false): Promise<number | null> {
	if (!API) return Promise.resolve(null);
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 6000);
	return fetch(`${API}/players`, { signal: ctrl.signal, cache: fresh ? 'no-store' : 'default' })
		.then(r => (r.ok ? r.json() as Promise<PlayerCount> : null))
		.then(c => (c && c.puzzle === puzzle && Number.isInteger(c.players) && c.players >= 0 ? c.players : null))
		.catch(() => null)
		.finally(() => clearTimeout(timer));
}

/** True if a summary has any battles worth showing. */
export const hasData = (s: CommunityStats | null) => !!s && Object.values(s.modes).some(m => m && m.played > 0);
