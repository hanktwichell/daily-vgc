// Talks to the recorder (recorder/): reports each finished day-of battle and fetches the
// community summary of finished puzzles. Disabled when no recorder URL is configured.
import type { BattleSubmission, CommunityStats } from '../shared/community';

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

/** Fire-and-forget: a failed report never affects the game. */
export function submitResult(result: Omit<BattleSubmission, 'cid' | 'v'>) {
	if (!API) return;
	try {
		const body: BattleSubmission = { ...result, cid: clientId(), v: VERSION };
		// text/plain keeps this a "simple" request (no CORS preflight), which keepalive needs.
		fetch(`${API}/result`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body), keepalive: true })
			.catch(() => {});
	} catch { /* ignore */ }
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

/** True if a summary has any battles worth showing. */
export const hasData = (s: CommunityStats | null) => !!s && Object.values(s.modes).some(m => m && m.played > 0);
