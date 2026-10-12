// Copies the subset of the Pokémon Showdown simulator (MIT) that Daily VGC needs
// into vendor/ps and patches out its Node-only dynamic file loading so it can be
// bundled for the browser. Usage: node scripts/vendor-ps.mjs <path-to-pokemon-showdown-checkout>
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const src = path.resolve(process.argv[2] || '');
if (!fs.existsSync(path.join(src, 'sim/battle.ts'))) {
	console.error('Pass the path to a pokemon-showdown checkout');
	process.exit(1);
}
const out = path.resolve('vendor/ps');
fs.rmSync(out, { recursive: true, force: true });

const copy = (rel) => {
	const to = path.join(out, rel);
	fs.mkdirSync(path.dirname(to), { recursive: true });
	fs.copyFileSync(path.join(src, rel), to);
};

const SIM = [
	'battle-actions', 'battle-queue', 'battle', 'dex-abilities', 'dex-conditions', 'dex-data', 'dex-formats',
	'dex-items', 'dex-moves', 'dex-species', 'dex-text', 'dex', 'field', 'global-types', 'pokemon', 'prng',
	'side', 'state', 'team-validator', 'teams',
];
for (const f of SIM) copy(`sim/${f}.ts`);
copy('lib/utils.ts');
const DATA = [
	'abilities', 'aliases', 'conditions', 'formats-data', 'items', 'learnsets', 'moves', 'natures', 'pokedex',
	'rulesets', 'scripts', 'tags', 'typechart',
];
for (const f of DATA) copy(`data/${f}.ts`);
for (const f of fs.readdirSync(path.join(src, 'data/mods/champions'))) copy(`data/mods/champions/${f}`);
copy('LICENSE');
for (const f of ['default', 'moves', 'abilities', 'items', 'names']) copy(`data/text/${f}.ts`);

const patch = (rel, pairs) => {
	const file = path.join(out, rel);
	let text = fs.readFileSync(file, 'utf8');
	for (const [from, to] of pairs) {
		if (!text.includes(from)) throw new Error(`Patch target not found in ${rel}: ${from}`);
		text = text.split(from).join(to);
	}
	fs.writeFileSync(file, text);
};

patch('sim/dex.ts', [
	["import * as fs from 'fs';\nimport * as path from 'path';\n", "import { psData } from './registry';\n"],
	["const DATA_DIR = path.resolve(__dirname, '../data');", "const DATA_DIR = 'data';"],
	["const MODS_DIR = path.resolve(DATA_DIR, './mods');", "const MODS_DIR = 'data/mods';"],
	[`			const filePath = basePath + DATA_FILES[dataType];
			const dataObject = require(filePath);`,
	`			const filePath = basePath + DATA_FILES[dataType];
			const mod = basePath === DATA_DIR + '/' ? psData().base : psData().mods[basePath.slice(MODS_DIR.length + 1, -1)];
			const dataObject = mod?.[dataType] ? { [dataType]: mod[dataType] } : null;
			if (!dataObject) return;`],
	['for (const mod of fs.readdirSync(MODS_DIR)) {', 'for (const mod of Object.keys(psData().mods)) {'],
	["const exported = require(path.resolve(DATA_DIR, 'aliases'));", 'const exported = psData().aliases;'],
]);
patch('sim/dex-formats.ts', [
	['customFormats = require(`${__dirname}/../config/custom-formats`).Formats;\n\t\t\tif (!Array.isArray(customFormats)) {', 'customFormats = undefined;\n\t\t\tif (customFormats) {'],
	['let Formats: AnyObject[] = require(`${__dirname}/../config/formats`).Formats;', 'let Formats: AnyObject[] = psData().formats;'],
	["import { Tags } from '../data/tags';", "import { Tags } from '../data/tags';\nimport { psData } from './registry';"],
]);
patch('sim/dex-species.ts', [
	["import { isDeepStrictEqual } from 'node:util';", "const isDeepStrictEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);"],
]);
patch('sim/prng.ts', [
	["if (typeof crypto === 'undefined') globalThis.crypto = require('node:crypto');", '// crypto is global in browsers and Node 19+'],
]);
let dexText = fs.readFileSync(path.join(out, 'sim/dex-text.ts'), 'utf8');
dexText = dexText.replace(/^import \* as path from 'path';\n/m, '')
	.replace(/^const TEXT_DIR = .*$/m, "const TEXT_DIR = 'data/text';");
dexText = dexText.replace(/(static loadTextFile\([^)]*\)[^{]*\{)/, '$1\n\t\treturn {} as any;');
fs.writeFileSync(path.join(out, 'sim/dex-text.ts'), dexText);

fs.writeFileSync(path.join(out, 'sim/registry.ts'), `// Added by Daily VGC: static data registry replacing Showdown's runtime require() calls.
export interface PSDataTable { [dataType: string]: any }
export interface PSData {
	base: PSDataTable;
	mods: { [mod: string]: PSDataTable };
	aliases: { Aliases: { [k: string]: string }, CompoundWordNames: string[] };
	formats: any[];
}
export function psData(): PSData {
	const data = (globalThis as any).__PS_DATA__;
	if (!data) throw new Error('Showdown data not registered');
	return data;
}
export function registerPSData(data: PSData) {
	(globalThis as any).__PS_DATA__ = data;
}
`);

// Only the Champions VGC formats are needed; copied from config/formats.ts.
const formatsSrc = fs.readFileSync(path.join(src, 'config/formats.ts'), 'utf8');
const wanted = ['[Gen 9 Champions] VGC 2026 Reg M-C', '[Gen 9 Champions] Doubles Custom Game'];
const blocks = wanted.map(name => {
	const at = formatsSrc.indexOf(`name: "${name}",`);
	if (at < 0) throw new Error(`Format not found: ${name}`);
	const open = formatsSrc.lastIndexOf('\t{', at);
	const close = formatsSrc.indexOf('\n\t},', at);
	return formatsSrc.slice(open, close + 4);
});
fs.mkdirSync(path.join(out, 'config'), { recursive: true });
fs.writeFileSync(path.join(out, 'config/formats.ts'), `// Champions formats copied from Pokémon Showdown's config/formats.ts (MIT)
export const Formats: import('../sim/dex-formats').FormatList = [
${blocks.join('\n')}
];
`);

const rev = execSync('git rev-parse HEAD', { cwd: src }).toString().trim();
fs.writeFileSync(path.join(out, 'VERSION'), `smogon/pokemon-showdown@${rev}\n`);
console.log('Vendored Pokémon Showdown', rev);
