// Community stats smoke test against a local recorder (see recorder/README.md): fakes the clock
// to Oct 13 2026 (puzzle #1), expects yesterday's recap before the battle, plays #1 to the end
// and checks the recap isn't shown again.
// Usage: node scripts/e2e-community.mjs [url] [shotsDir] [--mobile]
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
const posts = [];
page.on('request', r => { if (r.method() === 'POST' && r.url().endsWith('/result')) posts.push(r.postData()); });
const shot = async name => { if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: name.startsWith('full') }); };
const fail = msg => { console.error('FAIL:', msg); process.exitCode = 1; };

await page.clock.install({ time: new Date('2026-10-13T15:00:00Z') });
await page.addInitScript(() => {
	if (!localStorage.getItem('dailyvgc:settings')) localStorage.setItem('dailyvgc:settings', JSON.stringify({ speed: 'fast', seenHelp: true }));
});
await page.goto(url);
await page.waitForSelector('.recap-headline', { timeout: 20000 }).catch(() => fail('recap not shown'));
await shot('full-c1-recap');
const hardTab = await page.$('.recap .mode-toggle button.hard');
if (hardTab) { await hardTab.click(); await shot('full-c2-recap-hard'); }
await page.click('.recap-play');
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
await page.waitForTimeout(1000);
console.log('submitted', posts);
if (posts.length !== 1) fail(`expected one submission, got ${posts.length}`);
await page.reload();
await page.waitForSelector('.results', { timeout: 20000 });
await page.waitForTimeout(1500);
if (await page.$('.recap')) fail('recap shown again after reload');
await page.click('button[aria-label="Statistics"]');
await page.click('.sheet-buttons >> text=Yesterday');
await page.waitForSelector('.recap-headline');
await shot('c3-recap-from-stats');
console.log('errors', errors);
if (errors.length) process.exitCode = 1;
await browser.close();
