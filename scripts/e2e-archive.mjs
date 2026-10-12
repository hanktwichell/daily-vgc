// Archive smoke test: fakes the clock to a later day, seeds some history, opens the calendar,
// plays a past puzzle to the end and checks it lands in the archive, not the main stats.
// Usage: node scripts/e2e-archive.mjs [url] [shotsDir] [--mobile]
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
const shot = async name => { if (shots) await page.screenshot({ path: `${shots}/${name}.png` }); };
const fail = msg => { console.error('FAIL:', msg); process.exitCode = 1; };

// Oct 15 2026, noon Eastern: puzzle #3, so #0-#2 are in the archive.
await page.clock.install({ time: new Date('2026-10-15T16:00:00Z') });
await page.addInitScript(() => {
	if (sessionStorage.getItem('seeded')) return;
	sessionStorage.setItem('seeded', '1');
	const rec = (number, won) => ({ number, won, alive: [won, won, false, true], turns: 12 });
	localStorage.setItem('dailyvgc:settings', JSON.stringify({ speed: 'fast', seenHelp: true }));
	localStorage.setItem('dailyvgc:stats', JSON.stringify({ played: 2, won: 1, streak: 0, maxStreak: 1, lastNumber: 1, history: { 0: rec(0, true), 1: rec(1, false) } }));
	localStorage.setItem('dailyvgc:stats-hard', JSON.stringify({ played: 1, won: 1, streak: 1, maxStreak: 1, lastNumber: 0, history: { 0: rec(0, true) } }));
});
await page.goto(url);
await page.waitForSelector('.mon-card', { timeout: 30000 });
if (!(await page.textContent('.puzzle-no')).includes('#3')) fail('expected puzzle #3 today');
await page.click('button[aria-label="Statistics"]');
await page.click('.archive-btn');
await page.waitForSelector('.cal-grid');
const boxes = await page.$$eval('.cal-box', els => els.map(e => e.className));
console.log('boxes', boxes);
if (boxes.length !== 3 || !boxes[0].includes('gold') || !boxes[1].includes('lost') || !boxes[2].includes('new')) fail('unexpected box states');
await shot('a1-calendar');
await page.click('.cal-box:nth-child(3)');
await shot('a2-detail');
await page.click('.cal-detail .btn.primary');
await page.waitForSelector('.mon-card', { timeout: 30000 });
const tag = await page.textContent('.title');
if (!tag.includes('#2') || !tag.includes('ARCHIVE')) fail(`header: ${tag}`);
if (await page.$('button[aria-label="Statistics"]')) fail('stats icon still shown in archive');
const cards = await page.$$('.mon-card');
for (const i of [0, 1, 2, 3]) await cards[i].click();
await page.click('.preview-footer .btn.primary');
await page.waitForSelector('.top-screen', { timeout: 10000 });
await page.click('button[aria-label="Archive calendar"]');
await page.waitForSelector('.cal-grid');
const cur = await page.$$eval('.cal-box', els => els.map(e => e.className));
if (!cur[2].includes('current')) fail(`current box not grey: ${cur[2]}`);
await shot('a3-calendar-current');
await page.click('.modal .close');

let shotMoves = false;
for (let step = 0; step < 400; step++) {
	if (await page.$('.results')) break;
	const confirm = await page.$('.confirm-move');
	const target = confirm || await page.$('.target-btn.p2:not([disabled])') || await page.$('.target-btn:not([disabled])');
	if (target) { await target.click(); continue; }
	const move = await page.$('.move-btn:not([disabled])');
	if (move) { if (!shotMoves) { shotMoves = true; await shot('a4-moves'); } await move.click(); continue; }
	const fight = await page.$('.fight-btn');
	if (fight) { await fight.click(); continue; }
	const sw = await page.$('.switch-btn');
	if (sw) { await sw.click(); continue; }
	const box = await page.$('.textbox');
	if (box) await box.click().catch(() => {});
	await page.waitForTimeout(150);
}
await page.waitForSelector('.results', { timeout: 120000 });
await shot('a5-results');
const stored = await page.evaluate(() => ({
	stats: JSON.parse(localStorage.getItem('dailyvgc:stats')),
	archive: JSON.parse(localStorage.getItem('dailyvgc:archive')),
}));
console.log('archive results', JSON.stringify(stored.archive));
if (stored.stats.played !== 2) fail('main stats changed');
if (!stored.archive?.['2']) fail('archive result not recorded');
const share = await page.textContent('.share-preview');
if (!share.includes('(Archive)')) fail(`share text: ${share}`);
await page.click('.results .btn >> text=Open archive');
await page.waitForSelector('.cal-grid');
await shot('a6-calendar-after');
console.log('errors', errors);
if (errors.length) process.exitCode = 1;
await browser.close();
