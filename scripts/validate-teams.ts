// Validates every set in the library (and every curated opponent team) against Reg M-C.
import { TeamValidator, Dex, FORMAT_ID } from '../src/engine/ps-node';
import { LIBRARY, materialize } from '../src/data/library';

const validator = TeamValidator.get(FORMAT_ID);
const dex = Dex.forFormat(FORMAT_ID);
let errors = 0;
const ids = new Set<string>();
for (const lib of LIBRARY) {
	if (ids.has(lib.id)) { console.log(`DUPLICATE id ${lib.id}`); errors++; }
	ids.add(lib.id);
	const sp = Object.values(lib.set.evs).reduce((a, b) => a + b, 0);
	if (sp !== 66) { console.log(`${lib.id}: ${sp} SP (expected 66)`); errors++; }
	if (lib.set.moves.length !== 4 && lib.set.species !== 'Ditto') { console.log(`${lib.id}: ${lib.set.moves.length} moves`); errors++; }
	for (const item of lib.items) {
		const set = materialize(lib, item);
		const probs = validator.validateSet(set, {});
		if (probs?.length) { console.log(`${lib.id} @ ${item}: ${probs.join(' | ')}`); errors++; }
	}
	const sp2 = dex.species.get(lib.set.species);
	if (!sp2.exists) { console.log(`${lib.id}: unknown species`); errors++; }
}
console.log(`${LIBRARY.length} sets, ${LIBRARY.filter(s => s.isMega).length} megas, ${errors} problems`);
if (process.argv.includes('--strict') && errors) process.exit(1);

import { OPPONENT_TEAMS } from '../src/data/opponents';
import { buildTeam } from '../src/data/team-builder';
import { getLibrarySet } from '../src/data/library';
let teamErrors = 0;
const usage = new Map<string, number>();
for (const team of OPPONENT_TEAMS) {
	try {
		const megas = team.sets.filter(id => getLibrarySet(id).isMega);
		if (megas.length !== 1) { console.log(`${team.id}: ${megas.length} megas`); teamErrors++; }
		if (team.sets.length !== 6) { console.log(`${team.id}: ${team.sets.length} sets`); teamErrors++; }
		for (const id of team.sets) usage.set(id, (usage.get(id) || 0) + 1);
		const sets = buildTeam(team.sets);
		const probs = validator.validateTeam(sets);
		if (probs?.length) { console.log(`${team.id}: ${probs.join(' | ')}`); teamErrors++; }
	} catch (e: any) { console.log(`${team.id}: ${e.message}`); teamErrors++; }
}
console.log(`${OPPONENT_TEAMS.length} opponent teams, ${teamErrors} problems`);
console.log('Most reused opponent sets:', [...usage].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}×${v}`).join(', '));
if (process.argv.includes('--strict') && (errors || teamErrors)) process.exit(1);
