// End-to-end smoke test: loads the site, picks a team, and plays a battle by always
// choosing the first available option. Usage: node scripts/e2e.mjs [url] [shotsDir] [--mobile]
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
const shot = async name => { if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: name.startsWith('full') }); };

await page.goto(url);
await page.waitForSelector('.modal', { timeout: 20000 });
await shot('01-help');
await page.click('.modal .close');
await page.waitForSelector('.mon-card', { timeout: 30000 });
await shot('full-02-preview');
const cards = await page.$$('.mon-card');
for (const i of [0, 1, 2, 3]) await cards[i].click();
await shot('03-picked');
await page.click('.preview-footer .btn.primary');
await page.waitForSelector('.top-screen', { timeout: 10000 });

let turns = 0;
for (let step = 0; step < 300; step++) {
	if (await page.$('.results')) break;
	const fight = await page.$('.fight-btn');
	const sw = await page.$('.switch-btn');
	const move = await page.$('.move-btn:not([disabled])');
	const target = await page.$('.target-btn.p2:not([disabled])');
	if (target) { if (!globalThis.tShot) { globalThis.tShot = 1; await shot('05c-target'); } await target.click(); continue; }
	if (move) {
		const mega = await page.$('.mega-toggle:not(.on)');
		if (mega) await mega.click();
		if (turns === 1) await shot('05-moves');
		await move.click();
		continue;
	}
	if (fight) {
		turns++;
		if (turns === 5 && process.argv.includes('--reload')) {
			await page.reload();
			await page.waitForSelector('.top-screen', { timeout: 20000 });
			console.log('reloaded mid-battle');
			await page.waitForSelector('.fight-btn, .switch-btn', { timeout: 60000 });
			await shot('05b-after-reload');
			continue;
		}
		if (turns === 1) await shot('04-battle-menu');
		if (turns === 3) await shot('06-turn3');
		await fight.click();
		continue;
	}
	if (sw) { if (!globalThis.sShot) { globalThis.sShot = 1; await shot('06b-switch'); } await sw.click(); continue; }
	// Speed through text.
	const box = await page.$('.textbox');
	if (box) await box.click().catch(() => {});
	await page.waitForTimeout(150);
}
await page.waitForSelector('.results', { timeout: 120000 });
await shot('07-results');
const resultText = await page.textContent('.results');
console.log('RESULT:', resultText.replace(/\s+/g, ' ').slice(0, 300));
console.log('turns clicked', turns, 'errors', errors);
await browser.close();
