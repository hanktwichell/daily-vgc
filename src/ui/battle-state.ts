// Client-side battle state, rebuilt from Showdown protocol lines as they are played back.

export type SideID = 'p1' | 'p2';

export interface FieldMon {
	ident: string;
	side: SideID;
	slot: number;
	name: string;
	species: string;
	speciesId: string;
	level: number;
	gender: string;
	hp: number;
	maxhp: number;
	/** p1 sees exact HP; p2 is reported out of 100. */
	exact: boolean;
	status: string;
	fainted: boolean;
	boosts: Record<string, number>;
	volatiles: string[];
}

export interface RosterEntry { name: string; speciesId: string; fainted: boolean; seen: boolean; hpFrac: number; status: string }

export interface SceneState {
	turn: number;
	active: Record<SideID, (FieldMon | null)[]>;
	roster: Record<SideID, RosterEntry[]>;
	weather: string;
	terrain: string;
	pseudo: string[];
	sideConditions: Record<SideID, string[]>;
	ended: boolean;
	winner: string;
}

export function emptyScene(): SceneState {
	return {
		turn: 0, active: { p1: [null, null], p2: [null, null] }, roster: { p1: [], p2: [] },
		weather: '', terrain: '', pseudo: [], sideConditions: { p1: [], p2: [] }, ended: false, winner: '',
	};
}

export function toID(text: string): string {
	return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function parsePokemonIdent(ident: string): { side: SideID; slot: number; name: string } | null {
	const m = /^(p[12])([ab])?: (.*)$/.exec(ident?.trim() || '');
	if (!m) return null;
	return { side: m[1] as SideID, slot: m[2] === 'b' ? 1 : m[2] === 'a' ? 0 : -1, name: m[3] };
}

function parseDetails(details: string) {
	const parts = details.split(', ');
	const species = parts[0];
	let level = 100, gender = '';
	for (const p of parts.slice(1)) {
		if (/^L\d+$/.test(p)) level = Number(p.slice(1));
		else if (p === 'M' || p === 'F') gender = p;
	}
	return { species, level, gender };
}

function parseHP(condition: string) {
	const [hpPart, status = ''] = (condition || '').split(' ');
	if (hpPart === '0' || status === 'fnt') return { hp: 0, maxhp: 0, status: 'fnt' };
	const [hp, max] = hpPart.split('/').map(Number);
	return { hp: hp || 0, maxhp: max || 100, status };
}

export function findMon(state: SceneState, ident: string): FieldMon | null {
	const id = parsePokemonIdent(ident);
	if (!id) return null;
	if (id.slot >= 0) {
		const mon = state.active[id.side][id.slot];
		if (mon) return mon;
	}
	return state.active[id.side].find(m => m?.name === id.name) ?? null;
}

function rosterEntry(state: SceneState, side: SideID, name: string, speciesId: string) {
	let entry = state.roster[side].find(r => r.name === name);
	if (!entry) {
		entry = { name, speciesId, fainted: false, seen: true, hpFrac: 1, status: '' };
		state.roster[side].push(entry);
	}
	return entry;
}

function syncRoster(state: SceneState, mon: FieldMon) {
	const entry = rosterEntry(state, mon.side, mon.name, mon.speciesId);
	entry.speciesId = mon.speciesId;
	entry.fainted = mon.fainted;
	entry.hpFrac = mon.maxhp ? mon.hp / mon.maxhp : 0;
	entry.status = mon.status;
}

export type Effect =
	| { kind: 'move'; source: string; target?: string; move: string }
	| { kind: 'damage'; target: string }
	| { kind: 'heal'; target: string }
	| { kind: 'faint'; target: string }
	| { kind: 'switch'; target: string }
	| { kind: 'mega'; target: string }
	| { kind: 'status'; target: string }
	| { kind: 'boost'; target: string; up: boolean }
	| { kind: 'none' };

/** Mutates `state` for one protocol line and returns a visual effect to animate. */
export function applyLine(state: SceneState, args: string[], kwArgs: Record<string, string>): Effect {
	const cmd = args[0];
	switch (cmd) {
	case 'turn':
		state.turn = Number(args[1]);
		return { kind: 'none' };
	case 'switch': case 'drag': case 'replace': {
		const id = parsePokemonIdent(args[1]);
		if (!id) break;
		const det = parseDetails(args[2]);
		const hp = parseHP(args[3]);
		const prev = state.active[id.side][id.slot];
		if (prev && cmd !== 'replace') syncRoster(state, prev);
		const mon: FieldMon = {
			ident: args[1], side: id.side, slot: id.slot, name: id.name, species: det.species, speciesId: toID(det.species),
			level: det.level, gender: det.gender, hp: hp.hp, maxhp: hp.maxhp, exact: id.side === 'p1',
			status: hp.status === 'fnt' ? '' : hp.status, fainted: hp.status === 'fnt', boosts: {}, volatiles: [],
		};
		state.active[id.side][id.slot] = mon;
		syncRoster(state, mon);
		return { kind: 'switch', target: args[1] };
	}
	case 'detailschange': case '-formechange': {
		const mon = findMon(state, args[1]);
		if (!mon) break;
		const det = parseDetails(args[2]);
		mon.species = det.species;
		mon.speciesId = toID(det.species);
		if (cmd === 'detailschange') syncRoster(state, mon);
		return { kind: 'none' };
	}
	case '-mega': {
		return { kind: 'mega', target: args[1] };
	}
	case 'move': {
		return { kind: 'move', source: args[1], target: args[3], move: args[2] };
	}
	case '-damage': case '-heal': case '-sethp': {
		const mon = findMon(state, args[1]);
		if (!mon) break;
		const before = mon.hp;
		const hp = parseHP(args[2]);
		if (hp.status === 'fnt') { mon.hp = 0; } else { mon.hp = hp.hp; mon.maxhp = hp.maxhp; }
		syncRoster(state, mon);
		if (cmd === '-damage') return { kind: 'damage', target: args[1] };
		return mon.hp >= before ? { kind: 'heal', target: args[1] } : { kind: 'damage', target: args[1] };
	}
	case 'faint': {
		const mon = findMon(state, args[1]);
		if (!mon) break;
		mon.fainted = true;
		mon.hp = 0;
		syncRoster(state, mon);
		return { kind: 'faint', target: args[1] };
	}
	case '-status': {
		const mon = findMon(state, args[1]);
		if (!mon) break;
		mon.status = args[2];
		syncRoster(state, mon);
		return { kind: 'status', target: args[1] };
	}
	case '-curestatus': {
		const mon = findMon(state, args[1]);
		if (mon) { mon.status = ''; syncRoster(state, mon); }
		else {
			const id = parsePokemonIdent(args[1]);
			const entry = id && state.roster[id.side].find(r => r.name === id.name);
			if (entry) entry.status = '';
		}
		return { kind: 'none' };
	}
	case '-cureteam': {
		const id = parsePokemonIdent(args[1]);
		if (id) for (const r of state.roster[id.side]) r.status = '';
		return { kind: 'none' };
	}
	case '-boost': case '-unboost': {
		const mon = findMon(state, args[1]);
		if (!mon) break;
		const amount = Number(args[3]) * (cmd === '-boost' ? 1 : -1);
		mon.boosts[args[2]] = Math.max(-6, Math.min(6, (mon.boosts[args[2]] || 0) + amount));
		if (!mon.boosts[args[2]]) delete mon.boosts[args[2]];
		return { kind: 'boost', target: args[1], up: amount > 0 };
	}
	case '-setboost': {
		const mon = findMon(state, args[1]);
		if (mon) mon.boosts[args[2]] = Number(args[3]);
		return { kind: 'none' };
	}
	case '-clearboost': case '-clearallboost': case '-clearnegativeboost': {
		const targets = cmd === '-clearallboost' ? [...state.active.p1, ...state.active.p2] : [findMon(state, args[1])];
		for (const mon of targets) {
			if (!mon) continue;
			if (cmd === '-clearnegativeboost') {
				for (const k of Object.keys(mon.boosts)) if (mon.boosts[k] < 0) delete mon.boosts[k];
			} else mon.boosts = {};
		}
		return { kind: 'none' };
	}
	case '-invertboost': {
		const mon = findMon(state, args[1]);
		if (mon) for (const k of Object.keys(mon.boosts)) mon.boosts[k] = -mon.boosts[k];
		return { kind: 'none' };
	}
	case '-copyboost': {
		const a = findMon(state, args[1]), b = findMon(state, args[2]);
		if (a && b) b.boosts = { ...a.boosts };
		return { kind: 'none' };
	}
	case '-weather': {
		if (kwArgs.upkeep !== undefined) return { kind: 'none' };
		state.weather = args[1] === 'none' ? '' : args[1];
		return { kind: 'none' };
	}
	case '-fieldstart': {
		const name = args[1].replace(/^move: /, '');
		if (/Terrain/.test(name)) state.terrain = name;
		else if (!state.pseudo.includes(name)) state.pseudo.push(name);
		return { kind: 'none' };
	}
	case '-fieldend': {
		const name = args[1].replace(/^move: /, '');
		if (/Terrain/.test(name)) state.terrain = '';
		else state.pseudo = state.pseudo.filter(p => p !== name);
		return { kind: 'none' };
	}
	case '-sidestart': case '-sideend': {
		const side = args[1].slice(0, 2) as SideID;
		const name = args[2].replace(/^(move|ability|item): /, '');
		const list = state.sideConditions[side];
		if (cmd === '-sidestart') { if (!list.includes(name)) list.push(name); }
		else state.sideConditions[side] = list.filter(c => c !== name);
		return { kind: 'none' };
	}
	case '-start': case '-end': {
		const mon = findMon(state, args[1]);
		if (!mon) break;
		const name = args[2].replace(/^(move|ability|item): /, '');
		if (cmd === '-start') { if (!mon.volatiles.includes(name)) mon.volatiles.push(name); }
		else mon.volatiles = mon.volatiles.filter(v => v !== name);
		return { kind: 'none' };
	}
	case 'swap': {
		const id = parsePokemonIdent(args[1]);
		if (!id) break;
		const target = Number(args[2]);
		const arr = state.active[id.side];
		const from = arr.findIndex(m => m?.name === id.name);
		if (from >= 0 && target !== from) {
			[arr[from], arr[target]] = [arr[target], arr[from]];
			arr.forEach((m, i) => { if (m) m.slot = i; });
		}
		return { kind: 'none' };
	}
	case 'win':
		state.ended = true;
		state.winner = args[1];
		return { kind: 'none' };
	case 'tie':
		state.ended = true;
		return { kind: 'none' };
	}
	return { kind: 'none' };
}
