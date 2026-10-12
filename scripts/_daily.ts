import { TeamValidator, FORMAT_ID } from '../src/engine/ps-node';
import { generateDaily, dateForPuzzleNumber, puzzleDateFor, msUntilNextPuzzle, ARCHETYPE_NAMES } from '../src/data/daily';
const v = TeamValidator.get(FORMAT_ID);
console.log('today', puzzleDateFor(), 'next in', Math.round(msUntilNextPuzzle() / 60000), 'min');
let bad = 0; const megaHist = [0, 0, 0];
for (let n = 1; n <= 200; n++) {
	const d = generateDaily(dateForPuzzleNumber(n));
	const probs = v.validateTeam(d.playerTeam);
	if (probs?.length) { bad++; console.log(n, probs.join('|')); }
	megaHist[d.playerTeam.filter(s => /ite( [XYZ])?$/.test(s.item)).length]++;
	if (n <= 8) console.log(`#${d.number} ${d.date} vs ${d.opponent.name} | ${ARCHETYPE_NAMES[d.archetype]}: ${d.playerTeam.map(s => `${s.species}@${s.item}`).join(', ')}`);
}
console.log('invalid', bad, 'mega histogram', megaHist);
