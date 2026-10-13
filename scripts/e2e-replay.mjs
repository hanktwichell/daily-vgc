// Replay smoke test: fakes the clock to Oct 13 2026 (puzzle #1) with the daily battle already
// lost, checks Hard Mode is open anyway, replays the daily battle to the end and checks the
// replay left no trace in the stats, the archive or the day's saved result.
// The recorder is faked, so any build works. Usage: node scripts/e2e-replay.mjs [url] [shotsDir] [--mobile]
import { chromium, devices } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3] || '';
const mobile = process.argv.includes('--mobile');
const browser = await chromium.launch();
const context = await browser.newContext(mobile ? { ...devices['iPhone 13'] } : { viewport: { width: 1100, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
// Stand in for the recorder, so nothing reaches a real one.
const posts = [];
const cors = { 'Access-Control-Allow-Origin': '*' };
await page.route(/\/(result|players|stats\/\d+)$/, route => {
	const req = route.request();
	if (req.method() === 'POST') posts.push(JSON.parse(req.postData()));
	return route.fulfill(req.url().endsWith('/players') ? { json: { puzzle: 1, players: 12 }, headers: cors }
		: req.method() === 'POST' ? { json: { ok: true }, headers: cors } : { status: 404, json: {}, headers: cors });
});
const shot = async name => { if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: name.startsWith('full') }); };
const fail = msg => { console.error('FAIL:', msg); process.exitCode = 1; };
const stored = () => page.evaluate(() => Object.fromEntries(
	['dailyvgc:stats', 'dailyvgc:stats-hard', 'dailyvgc:archive', 'dailyvgc:progress'].map(k => [k, localStorage.getItem(k)])));
const playToEnd = async () => {
	await page.waitForSelector('.mon-card', { timeout: 30000 });
	const cards = await page.$$('.mon-card');
	for (const i of [0, 1, 2, 3]) await cards[i].click();
	await page.click('.preview-footer .btn.primary');
	await page.waitForSelector('.top-screen', { timeout: 10000 });
	for (let step = 0; step < 400; step++) {
		if (await page.$('.results')) break;
		const confirm = await page.$('.confirm-move');
		const target = confirm || await page.$('.target-btn.p2:not([disabled])') || await page.$('.target-btn:not([disabled])');
		if (target) { await target.click(); continue; }
		const move = await page.$('.move-btn:not([disabled])');
		if (move) { await move.click(); continue; }
		const fight = await page.$('.fight-btn');
		if (fight) { await fight.click(); continue; }
		const sw = await page.$('.switch-btn');
		if (sw) { await sw.click(); continue; }
		const box = await page.$('.textbox');
		if (box) await box.click().catch(() => {});
		await page.waitForTimeout(150);
	}
	await page.waitForSelector('.results', { timeout: 120000 });
};

await page.clock.install({ time: new Date('2026-10-13T15:00:00Z') });
await page.addInitScript(() => {
	if (sessionStorage.getItem('seeded')) return;
	sessionStorage.setItem('seeded', '1');
	const lost = { number: 1, won: false, alive: [false, false, false, false], turns: 9 };
	localStorage.setItem('dailyvgc:settings', JSON.stringify({ speed: 'fast', seenHelp: true, recapSeen: 0 }));
	localStorage.setItem('dailyvgc:stats', JSON.stringify({ played: 1, won: 0, streak: 0, maxStreak: 0, lastNumber: 1, history: { 1: lost } }));
	localStorage.setItem('dailyvgc:progress', JSON.stringify({ number: 1, date: '2026-10-13', phase: 'done', order: [0, 1, 2, 3], lines: [], result: lost }));
});
await page.goto(url);
await page.waitForSelector('.results', { timeout: 30000 });
if (!(await page.textContent('.result-banner')).includes('DEFEATED')) fail('expected the seeded loss');
// A lost daily battle still opens Hard Mode.
if (!(await page.$('.hard-card .btn.hard'))) fail('Hard Mode not offered after a loss');
await shot('full-r1-lost-result');
const before = await stored();

await page.click('.results .btn >> text=Play again');
await page.waitForSelector('.mon-card', { timeout: 30000 });
const tag = await page.textContent('.title');
if (!tag.includes('#1') || !tag.includes('REPLAY')) fail(`header: ${tag}`);
await shot('r2-replay-preview');
await playToEnd();
await shot('full-r3-replay-result');
const after = await stored();
for (const k of Object.keys(before)) if (before[k] !== after[k]) fail(`${k} changed by a replay: ${before[k]} -> ${after[k]}`);
if (posts.length) fail(`a replay was reported to the recorder: ${JSON.stringify(posts)}`);
const share = await page.textContent('.share-preview');
if (!share.includes('(Replay)') || share.includes('Streak')) fail(`share text: ${share}`);
if (await page.$('.stat-row')) fail('stats shown on a replay result');

// It survives a reload, and leads back to the day's own result.
await page.reload();
await page.waitForSelector('.results', { timeout: 30000 });
if (!(await page.textContent('.title')).includes('REPLAY')) fail('replay not restored after reload');
await page.click('.results .btn >> text=Today\'s result');
await page.waitForSelector('.results .next', { timeout: 10000 });
if ((await page.textContent('.title')).includes('REPLAY')) fail('still in the replay after going back');
if (!(await page.textContent('.result-banner')).includes('DEFEATED')) fail('the day\'s result changed');

// Hard Mode's first try is the real one, even after replaying the daily battle.
await page.click('.hard-card .btn.hard');
await playToEnd();
const hard = JSON.parse((await stored())['dailyvgc:stats-hard']);
if (hard?.played !== 1 || !hard.history?.['1']) fail(`hard mode's first try wasn't counted: ${JSON.stringify(hard)}`);
// (Nothing is reported at all when the build has no recorder configured.)
if (posts.length > 1 || posts.some(p => p.mode !== 'hard')) fail(`expected only the hard mode result to be reported: ${JSON.stringify(posts)}`);
if (!(await page.$('.results .btn >> text=Play again'))) fail('no Play again on the Hard Mode result');
await shot('full-r4-hard-result');
console.log('replay left storage untouched; hard mode counted', JSON.stringify({ played: hard?.played, won: hard?.won }));
console.log('errors', errors);
if (errors.length) process.exitCode = 1;
await browser.close();
