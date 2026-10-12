// Daily VGC recorder: stores one anonymous result per browser for each day's battles and
// serves a summary of each puzzle once its day is over.
//
//   POST /result           a finished battle (BattleSubmission), only for today's puzzle
//                          (or yesterday's, for a few hours after midnight)
//   GET  /stats/:puzzle    CommunityStats for a finished puzzle
//   GET  /export/:puzzle   raw results for a finished puzzle (Authorization: Bearer ADMIN_TOKEN)
import { puzzleDateFor, puzzleNumberFor, dateForPuzzleNumber } from '../../src/data/calendar';
import { aggregate, validateSubmission, COMMUNITY_MODES, type CommunityStats, type StoredBattle } from '../../src/shared/community';

export interface Env {
	DB: D1Database;
	ALLOWED_ORIGINS?: string;
	/** Enables /export. */
	ADMIN_TOKEN?: string;
	/** Salt for IP hashes. */
	SALT?: string;
	/** Max results per IP address per puzzle and mode. */
	PER_IP_LIMIT?: string;
	/** For local testing only: pretend it's this time (ISO string). */
	NOW?: string;
}

/** Battles that started before midnight can still report for this long afterwards. */
const GRACE_MS = 3 * 3600_000;
/** How often a summary is recomputed while late results can still arrive. */
const REFRESH_MS = 10 * 60_000;

const puzzleAt = (t: number) => puzzleNumberFor(puzzleDateFor(new Date(t)));

function corsHeaders(req: Request, env: Env): Record<string, string> {
	const origin = req.headers.get('Origin') ?? '';
	const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
	const ok = allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
	return {
		'Access-Control-Allow-Origin': ok ? origin : '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Vary': 'Origin',
	};
}

function originAllowed(req: Request, env: Env) {
	const origin = req.headers.get('Origin');
	if (!origin) return true; // non-browser clients (curl, tests)
	return corsHeaders(req, env)['Access-Control-Allow-Origin'] === origin;
}

const json = (body: unknown, status: number, headers: Record<string, string>, cache = 'no-store') =>
	new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': cache } });

async function sha256(text: string) {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function submit(req: Request, env: Env, now: number, cors: Record<string, string>) {
	if (!originAllowed(req, env)) return json({ error: 'origin not allowed' }, 403, cors);
	const text = await req.text();
	if (text.length > 2000) return json({ error: 'too large' }, 413, cors);
	let body: unknown;
	try { body = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400, cors); }
	const s = validateSubmission(body);
	if (typeof s === 'string') return json({ error: s }, 400, cors);
	// Only the current day's puzzle counts (archive replays don't), plus a grace period after midnight.
	if (s.puzzle !== puzzleAt(now) && s.puzzle !== puzzleAt(now - GRACE_MS)) return json({ error: 'puzzle not open' }, 409, cors);

	const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
	const iphash = await sha256(`${ip}|${s.puzzle}|${env.SALT ?? 'daily-vgc'}`);
	const limit = Number(env.PER_IP_LIMIT ?? 20);
	const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM results WHERE puzzle = ? AND mode = ? AND iphash = ?')
		.bind(s.puzzle, s.mode, iphash).first<{ n: number }>();
	if ((used?.n ?? 0) >= limit) return json({ error: 'too many results from this address' }, 429, cors);

	const res = await env.DB.prepare(
		`INSERT OR IGNORE INTO results (puzzle, mode, cid, iphash, won, alive, turns, picks, team, version, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	).bind(s.puzzle, s.mode, s.cid, iphash, s.won ? 1 : 0, s.alive, s.turns, s.picks.join(','), JSON.stringify(s.team), s.v ?? null, now).run();
	return json({ ok: true, duplicate: res.meta.changes === 0 }, 200, cors);
}

async function stats(puzzle: number, env: Env, now: number, cors: Record<string, string>) {
	if (puzzle < 0 || puzzle >= puzzleAt(now)) return json({ error: 'puzzle not finished' }, 404, cors);
	const cached = await env.DB.prepare('SELECT body, final, computed_at FROM stats_cache WHERE puzzle = ?')
		.bind(puzzle).first<{ body: string; final: number; computed_at: number }>();
	const final = puzzleAt(now - GRACE_MS) > puzzle;
	let body = cached?.body;
	if (!cached || (!cached.final && (final || now - cached.computed_at > REFRESH_MS))) {
		const summary: CommunityStats = { puzzle, date: dateForPuzzleNumber(puzzle), final, modes: {} };
		for (const mode of COMMUNITY_MODES) {
			const { results } = await env.DB.prepare('SELECT won, alive, picks, team FROM results WHERE puzzle = ? AND mode = ?')
				.bind(puzzle, mode).all<StoredBattle>();
			const m = aggregate(results);
			if (m) summary.modes[mode] = m;
		}
		body = JSON.stringify(summary);
		await env.DB.prepare('INSERT OR REPLACE INTO stats_cache (puzzle, body, final, computed_at) VALUES (?, ?, ?, ?)')
			.bind(puzzle, body, final ? 1 : 0, now).run();
	}
	const isFinal = JSON.parse(body!).final;
	return new Response(body, {
		headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': isFinal ? 'public, max-age=86400' : 'public, max-age=300' },
	});
}

async function exportRows(req: Request, puzzle: number, env: Env, now: number, cors: Record<string, string>) {
	if (!env.ADMIN_TOKEN || req.headers.get('Authorization') !== `Bearer ${env.ADMIN_TOKEN}`) return json({ error: 'unauthorized' }, 401, cors);
	if (puzzle < 0 || puzzle >= puzzleAt(now)) return json({ error: 'puzzle not finished' }, 404, cors);
	const { results } = await env.DB.prepare(
		'SELECT puzzle, mode, cid, won, alive, turns, picks, team, version, created_at FROM results WHERE puzzle = ? ORDER BY id',
	).bind(puzzle).all();
	return json(results, 200, cors);
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const cors = corsHeaders(req, env);
		const now = env.NOW ? Date.parse(env.NOW) : Date.now();
		const url = new URL(req.url);
		try {
			if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
			if (req.method === 'POST' && url.pathname === '/result') return await submit(req, env, now, cors);
			const m = url.pathname.match(/^\/(stats|export)\/(\d{1,6})$/);
			if (req.method === 'GET' && m) {
				const puzzle = Number(m[2]);
				return m[1] === 'stats' ? await stats(puzzle, env, now, cors) : await exportRows(req, puzzle, env, now, cors);
			}
			if (req.method === 'GET' && url.pathname === '/') {
				return json({ service: 'Daily VGC recorder', today: puzzleAt(now) }, 200, cors);
			}
			return json({ error: 'not found' }, 404, cors);
		} catch (e) {
			console.error(e);
			return json({ error: 'server error' }, 500, cors);
		}
	},
} satisfies ExportedHandler<Env>;
