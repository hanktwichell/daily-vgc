// Copies community stats for recently finished puzzles from the recorder into community/:
//   community/stats/<puzzle>.json      the summary shown on the site
//   community/battles/<puzzle>.jsonl   one anonymous result per line (needs RECORDER_ADMIN_TOKEN)
// Usage: npx tsx scripts/archive-community.ts [--days 3]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { puzzleDateFor, puzzleNumberFor } from '../src/data/calendar';

const url = (process.env.RECORDER_URL ||
	(existsSync('recorder.json') ? JSON.parse(readFileSync('recorder.json', 'utf8')).url : '') || '').replace(/\/$/, '');
if (!url) {
	console.log('No recorder configured (recorder.json); nothing to archive.');
	process.exit(0);
}
const daysArg = process.argv.indexOf('--days');
const days = daysArg > 0 ? Number(process.argv[daysArg + 1]) : 3;
const token = process.env.RECORDER_ADMIN_TOKEN;
const today = puzzleNumberFor(puzzleDateFor());

mkdirSync('community/stats', { recursive: true });
if (token) mkdirSync('community/battles', { recursive: true });

for (let n = Math.max(0, today - days); n < today; n++) {
	const res = await fetch(`${url}/stats/${n}`);
	if (!res.ok) { console.log(`#${n}: no stats (${res.status})`); continue; }
	const stats = await res.json();
	writeFileSync(`community/stats/${n}.json`, `${JSON.stringify(stats, null, '\t')}\n`);
	const counts = Object.entries(stats.modes).map(([m, s]: [string, any]) => `${m} ${s.played}`).join(', ');
	console.log(`#${n}: ${counts || 'no battles'}${stats.final ? '' : ' (not final yet)'}`);
	if (!token) continue;
	const raw = await fetch(`${url}/export/${n}`, { headers: { Authorization: `Bearer ${token}` } });
	if (!raw.ok) { console.log(`#${n}: export failed (${raw.status})`); continue; }
	const rows = await raw.json() as any[];
	writeFileSync(`community/battles/${n}.jsonl`, rows.map(r => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
}
