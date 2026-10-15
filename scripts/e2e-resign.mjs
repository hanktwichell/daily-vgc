// Resign flow: cancelling the confirmation keeps the battle going; confirming ends it as a loss.
// Usage: node scripts/e2e-resign.mjs [shotsDir] (with `npm run preview` serving on :4173)
import { chromium, devices } from 'playwright';
const dir = process.argv[2] || '';
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|recorder|workers\.dev|ERR_/.test(m.text())) errors.push(m.text()); });
await page.goto('http://localhost:4173/');
await page.waitForSelector('.modal', { timeout: 20000 });
await page.click('.modal .close');
await page.waitForSelector('.mon-card', { timeout: 30000 });
const cards = await page.$$('.mon-card');
for (const i of [0, 1, 2, 3]) await cards[i].click();
await page.click('.preview-footer .btn.primary');
await page.waitForSelector('.resign-btn', { timeout: 60000 });
if (dir) await page.screenshot({ path: `${dir}/1-menu.png` });
// Cancel first: battle continues.
await page.click('.resign-btn');
await page.waitForSelector('.resign-confirm');
if (dir) await page.screenshot({ path: `${dir}/2-confirm.png` });
await page.click('.resign-actions .btn.ghost');
if (await page.$('.resign-confirm')) throw new Error('modal still open');
if (!await page.$('.fight-btn')) throw new Error('menu gone after cancel');
// Now resign for real.
await page.click('.resign-btn');
await page.click('.resign-actions .btn.primary');
await page.waitForSelector('.results', { timeout: 30000 });
if (dir) await page.screenshot({ path: `${dir}/3-results.png` });
console.log('banner:', await page.textContent('.result-banner'), '|', (await page.textContent('.result-sub')).trim());
const stats = await page.evaluate(() => [localStorage.getItem('dailyvgc:stats'), localStorage.getItem('dailyvgc:progress')]);
console.log(stats[0]);
console.log(JSON.parse(stats[1]).phase, JSON.stringify(JSON.parse(stats[1]).result));
// Reload stays on results.
await page.reload();
await page.waitForSelector('.results', { timeout: 30000 });
console.log('after reload still results; errors:', errors);
await browser.close();
