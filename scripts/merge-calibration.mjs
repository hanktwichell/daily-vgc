// Merges shard outputs into src/data/calibrated.json. Usage: node scripts/merge-calibration.mjs <shard.json>...
import fs from 'node:fs';
const target = 'src/data/calibrated.json';
const merged = JSON.parse(fs.readFileSync(target, 'utf8'));
for (const file of process.argv.slice(2)) {
	if (!fs.existsSync(file)) continue;
	for (const [date, entry] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')))) merged[date] ??= entry;
}
const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(target, JSON.stringify(sorted, null, '\t') + '\n');
console.log(`${Object.keys(sorted).length} calibrated dates`);
