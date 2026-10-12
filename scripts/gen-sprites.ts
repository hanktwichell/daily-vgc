// Downloads Gen V-style (Black/White) pixel sprites from PokeAPI's sprite repository for every
// species/forme the game can show. One style for everything: it is the only DS-era set in PokeAPI
// that covers every Pokémon and Mega Evolution, front and back.
// Writes public/sprites/{front,back}/<showdown id>.png and src/generated/sprites.json.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import '../src/engine/ps-node';
import { Dex, FORMAT_ID, toID } from '../src/engine/ps';
import { LIBRARY } from '../src/data/library';

const dex = Dex.forFormat(FORMAT_ID);
const RAW = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/';
const csv = fs.readFileSync('scripts/data/pokeapi-pokemon.csv', 'utf8').trim().split('\n').slice(1);
const idByName = new Map(csv.map(line => { const [id, name] = line.split(','); return [name, Number(id)]; }));
const files = new Set(zlib.gunzipSync(fs.readFileSync('scripts/data/pokeapi-sprite-files.txt.gz')).toString().split('\n'));

const SPECIAL: Record<string, string> = {
	meowstic: 'meowstic-male', meowsticf: 'meowstic-female', meowsticmmega: 'meowstic-male-mega', meowsticfmega: 'meowstic-female-mega',
	gourgeist: 'gourgeist-average', indeedeef: 'indeedee-female', indeedee: 'indeedee-male', basculegion: 'basculegion-male',
	basculegionf: 'basculegion-female', taurospaldeaaqua: 'tauros-paldea-aqua-breed', taurospaldeablaze: 'tauros-paldea-blaze-breed',
	taurospaldeacombat: 'tauros-paldea-combat-breed', lycanroc: 'lycanroc-midday', toxtricity: 'toxtricity-amped',
	aegislash: 'aegislash-shield', aegislashblade: 'aegislash-blade', mimikyu: 'mimikyu-disguised', mimikyubusted: 'mimikyu-busted',
	palafin: 'palafin-zero', palafinhero: 'palafin-hero', maushold: 'maushold-family-of-three', mausholdfour: 'maushold-family-of-four',
	squawkabilly: 'squawkabilly-green-plumage', morpeko: 'morpeko-full-belly', morpekohangry: 'morpeko-hangry', mrrime: 'mr-rime',
	pyroar: 'pyroar-male', sirfetchd: 'sirfetchd', farfetchd: 'farfetchd', castformsunny: 'castform-sunny', castformrainy: 'castform-rainy', castformsnowy: 'castform-snowy',
};

function pokeapiId(speciesName: string): number | undefined {
	const id = toID(speciesName);
	const name = SPECIAL[id] ?? speciesName.toLowerCase().replace(/[’'.:]/g, '').replace(/ /g, '-');
	return idByName.get(name);
}

function bestPath(id: number, back: boolean): string | undefined {
	const b = back ? 'back/' : '';
	const path = `sprites/pokemon/versions/generation-v/black-white/${b}${id}.png`;
	return files.has(path) ? path : undefined;
}

// Every species a battle might display: library sets, their Megas, and in-battle formes.
const names = new Set<string>();
for (const lib of LIBRARY) {
	const species = dex.species.get(lib.set.species);
	names.add(species.name);
	const stone = dex.items.get(lib.items[0]);
	if (stone.megaStone) for (const mega of Object.values(stone.megaStone)) names.add(mega as string);
	for (const forme of species.otherFormes || []) {
		const f = dex.species.get(forme);
		if (f.exists && !f.isMega && !f.name.includes('Totem') && ['Castform', 'Aegislash', 'Mimikyu', 'Palafin', 'Morpeko', 'Cherrim'].includes(f.baseSpecies)) names.add(f.name);
	}
}

const out: Record<string, { front: string, back: string }> = {};
fs.mkdirSync('public/sprites/front', { recursive: true });
fs.mkdirSync('public/sprites/back', { recursive: true });
const missing: string[] = [];
// Downloads go through curl so they respect HTTPS_PROXY.
const downloads: [string, string][] = [];
for (const name of [...names].sort()) {
	const id = pokeapiId(name);
	if (!id) { missing.push(name); continue; }
	const front = bestPath(id, false), back = bestPath(id, true);
	if (!front || !back) { missing.push(`${name} (no Gen V-style sprite for ${id})`); continue; }
	const key = toID(name);
	out[key] = { front: `sprites/front/${key}.png`, back: `sprites/back/${key}.png` };
	downloads.push([front, `public/sprites/front/${key}.png`]);
	downloads.push([back, `public/sprites/back/${key}.png`]);
}
const todo = downloads.filter(([, to]) => !fs.existsSync(to));
for (let i = 0; i < todo.length; i += 40) {
	const args = ['-sSf', '--parallel', '--retry', '3'];
	for (const [path, to] of todo.slice(i, i + 40)) args.push(RAW + path, '-o', to);
	execFileSync('curl', args, { stdio: 'inherit' });
}
fs.writeFileSync('src/generated/sprites.json', JSON.stringify(out, null, '\t'));
console.log(`${Object.keys(out).length} sprites`);
if (missing.length) {
	console.log('MISSING', missing.join(', '));
	process.exitCode = 1;
}
