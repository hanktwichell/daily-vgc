import '../src/engine/ps-node';
import { generateDaily, dateForPuzzleNumber } from '../src/data/daily';
import { matchupScore } from '../src/engine/matchup';
for (let n = 1; n <= 48; n++) {
	const d = generateDaily(dateForPuzzleNumber(n));
	const t = Date.now();
	console.log(n, d.opponent.id, matchupScore(d.playerTeam, d.opponentTeam).toFixed(2), Date.now() - t, 'ms');
}
